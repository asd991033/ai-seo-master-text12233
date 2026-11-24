import "server-only";
import { and, eq, gt, like } from "drizzle-orm";
import { db, schema } from "@/db";
import { setSetting } from "@/lib/settings";
import { sendOrderToSupplier } from "@/lib/supplier";
import { stripeConfig, toMinor } from "@/lib/stripe";

const KEY = "stripe_webhook_secret";
const EVENTS = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];
export type StripeSession = { id: string; payment_status?: string; amount_total?: number; currency?: string; client_reference_id?: string; metadata?: { orderNo?: string }; payment_intent?: string };

async function api<T>(method: "GET" | "POST" | "DELETE", path: string, body?: URLSearchParams): Promise<T> {
  const cfg = stripeConfig();
  if (!cfg) throw new Error("Stripe is not configured");
  const res = await fetch(`https://api.stripe.com/v1${path}`, { method, headers: { Authorization: `Bearer ${cfg.secret}`, ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) }, body });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe HTTP ${res.status}`);
  return json;
}

/** Webhook 簽章密鑰：優先用環境變數，否則用網站自動建立時存下來的 */
export async function webhookSecret(): Promise<string> {
  const env = stripeConfig()?.webhookSecret;
  if (env) return env;
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY));
  return row?.value ?? "";
}

/**
 * 還沒有 Webhook 密鑰時，自動到 Stripe 建立通知端點並把密鑰存起來。
 * Stripe 只在建立當下回傳密鑰，所以同網址的舊端點（密鑰已拿不到）會先移除再重建。
 */
export async function ensureWebhook(origin: string): Promise<"exists" | "created" | "skipped"> {
  if (!stripeConfig() || !/^https:\/\//.test(origin)) return "skipped";
  if (await webhookSecret()) return "exists";
  const url = `${origin}/api/stripe/webhook`;
  const list = await api<{ data: { id: string; url: string }[] }>("GET", "/webhook_endpoints?limit=100");
  for (const e of list.data.filter((x) => x.url === url)) await api("DELETE", `/webhook_endpoints/${e.id}`);
  const p = new URLSearchParams({ url, description: "Kindmark order payments" });
  EVENTS.forEach((e) => p.append("enabled_events[]", e));
  const made = await api<{ id: string; secret?: string }>("POST", "/webhook_endpoints", p);
  if (!made.secret) throw new Error("Stripe did not return a signing secret");
  await setSetting(KEY, made.secret);
  return "created";
}

/** Stripe 回報已付款、金額與幣別都相符，就把訂單標為已付款並送單給供應商。回傳訂單是否為已付款 */
export async function applySession(s: StripeSession): Promise<boolean> {
  const orderNo = s.metadata?.orderNo || s.client_reference_id || "";
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.orderNo, orderNo));
  if (!order) return false;
  if (order.paid) return true;
  if (s.payment_status !== "paid" || s.amount_total !== toMinor(order.total) || (s.currency ?? "").toUpperCase() !== order.currency) return false;
  // 加上 paid = false 條件，Webhook 與其他查證同時進來時只會有一個成功，不會重複送單
  const done = await db.update(schema.orders)
    .set({ paid: true, paidAt: Math.floor(Date.now() / 1000), paymentMethod: "stripe", paymentRef: String(s.payment_intent ?? s.id).slice(0, 80), status: order.status === "pending_payment" ? "reviewing" : order.status })
    .where(and(eq(schema.orders.id, order.id), eq(schema.orders.paid, false))).returning({ id: schema.orders.id });
  if (done.length) void sendOrderToSupplier(order.id).catch((e) => console.error("[supplier] auto send failed", order.orderNo, e));
  return true;
}

/** 直接向 Stripe 查這張訂單的付款頁結果（客戶付完跳回、或 Webhook 沒送到時用） */
export async function checkOrderPayment(order: { paid: boolean; paymentRef: string | null }): Promise<boolean> {
  if (order.paid) return true;
  if (!order.paymentRef?.startsWith("cs_") || !stripeConfig()) return false;
  try { return await applySession(await api<StripeSession>("GET", `/checkout/sessions/${encodeURIComponent(order.paymentRef)}`)); }
  catch (e) { console.error("[stripe] check failed", e); return false; }
}

/** 定時補查：最近三天開過付款頁但還沒標成已付款的訂單 */
export async function syncStripePayments(): Promise<number> {
  if (!stripeConfig()) return 0;
  const since = Math.floor(Date.now() / 1000) - 3 * 86400;
  const rows = await db.select({ paid: schema.orders.paid, paymentRef: schema.orders.paymentRef }).from(schema.orders)
    .where(and(eq(schema.orders.paid, false), eq(schema.orders.status, "pending_payment"), like(schema.orders.paymentRef, "cs_%"), gt(schema.orders.createdAt, since))).limit(100);
  let n = 0;
  for (const r of rows) if (await checkOrderPayment(r)) n++;
  return n;
}
