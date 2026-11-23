import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendOrderToSupplier } from "@/lib/supplier";
import { stripeConfig, toMinor, verifyWebhook } from "@/lib/stripe";

export const dynamic = "force-dynamic";
const text = (s: string, status = 200) => new Response(s, { status, headers: { "Content-Type": "text/plain" } });

type Session = { id: string; payment_status?: string; amount_total?: number; currency?: string; client_reference_id?: string; metadata?: { orderNo?: string }; payment_intent?: string };

/**
 * Stripe 的付款結果通知。簽章正確、已付款、金額與幣別都相符才把訂單標為已付款。
 * 到 Stripe 後台 Developers → Webhooks 新增端點 https://網域/api/stripe/webhook，事件選 checkout.session.completed 與 checkout.session.async_payment_succeeded
 */
export async function POST(req: Request) {
  const cfg = stripeConfig();
  if (!cfg?.webhookSecret) return text("not configured", 503);
  const payload = await req.text();
  if (!verifyWebhook(payload, req.headers.get("stripe-signature"), cfg.webhookSecret)) return text("bad signature", 400);
  const event = JSON.parse(payload) as { type?: string; data?: { object?: Session } };
  const s = event.data?.object;
  if (!s || !["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type ?? "")) return text("ignored");
  const orderNo = s.metadata?.orderNo || s.client_reference_id || "";
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.orderNo, orderNo));
  if (!order) return text("order not found");
  if (s.payment_status === "paid" && s.amount_total === toMinor(order.total) && (s.currency ?? "").toUpperCase() === order.currency && !order.paid) {
    await db.update(schema.orders)
      .set({ paid: true, paymentMethod: "stripe", paymentRef: String(s.payment_intent ?? s.id).slice(0, 80), status: order.status === "pending_payment" ? "reviewing" : order.status })
      .where(eq(schema.orders.id, order.id));
    void sendOrderToSupplier(order.id).catch((e) => console.error("[supplier] auto send failed", order.orderNo, e));
  }
  return text("ok");
}
