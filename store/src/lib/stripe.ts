import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe Checkout（海外站的線上付款）。不裝 SDK，直接呼叫 REST API。
 * 環境變數：STRIPE_SECRET_KEY（sk_live_… / sk_test_…）、STRIPE_WEBHOOK_SECRET（whsec_…）
 */
export const stripeConfig = () => {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  return secret ? { secret, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "" } : null;
};
export const stripeEnabled = () => !!stripeConfig();

/** Stripe 的金額用最小單位（分）；這幾個市場的幣別都是兩位小數 */
export const toMinor = (amount: number) => Math.round(amount * 100);

export type CheckoutInput = { orderNo: string; total: number; currency: string; email: string; successUrl: string; cancelUrl: string; description: string };

/** 組出建立 Checkout Session 的表單欄位（整張訂單一個品項，金額與本站訂單總額完全一致） */
export function sessionParams(o: CheckoutInput): URLSearchParams {
  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("success_url", o.successUrl);
  p.set("cancel_url", o.cancelUrl);
  p.set("client_reference_id", o.orderNo);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) p.set("customer_email", o.email);
  p.set("metadata[orderNo]", o.orderNo);
  p.set("payment_intent_data[metadata][orderNo]", o.orderNo);
  p.set("line_items[0][quantity]", "1");
  p.set("line_items[0][price_data][currency]", o.currency.toLowerCase());
  p.set("line_items[0][price_data][unit_amount]", String(toMinor(o.total)));
  p.set("line_items[0][price_data][product_data][name]", `Order ${o.orderNo}`);
  if (o.description) p.set("line_items[0][price_data][product_data][description]", o.description.slice(0, 480));
  return p;
}

export async function createCheckoutSession(o: CheckoutInput): Promise<{ id: string; url: string }> {
  const cfg = stripeConfig();
  if (!cfg) throw new Error("Stripe is not configured");
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.secret}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `${o.orderNo}-${toMinor(o.total)}-${Math.floor(Date.now() / 600000)}` },
    body: sessionParams(o),
  });
  const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !json.url || !json.id) throw new Error(json.error?.message ?? `Stripe HTTP ${res.status}`);
  return { id: json.id, url: json.url };
}

/** 驗證 Webhook 的 Stripe-Signature 標頭（t=時間戳,v1=HMAC-SHA256(`${t}.${payload}`)），時間差超過容許值也視為無效 */
export function verifyWebhook(payload: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000), tolerance = 300): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((x) => x.trim().split("="));
  const ts = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!ts || !sigs.length || Math.abs(nowSec - Number(ts)) > tolerance) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex"));
  return sigs.some((s) => { const b = Buffer.from(s ?? ""); return b.length === expected.length && timingSafeEqual(b, expected); });
}
