import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { keyQs, orderFor } from "@/lib/order-access";
import { siteOrigin } from "@/lib/ecpay";
import { createCheckoutSession, stripeEnabled } from "@/lib/stripe";
import { localize, marketOf } from "@/config/markets";

export const dynamic = "force-dynamic";

/** 建立 Stripe Checkout 並把客戶帶過去。只有訂單本人、且訂單尚未付款時才會建立 */
export async function GET(req: Request) {
  const orderNo = new URL(req.url).searchParams.get("orderNo") ?? "";
  const origin = siteOrigin(req);
  const order = await orderFor(orderNo, new URL(req.url).searchParams.get("key"));
  if (!order) return Response.redirect(`${origin}/login?next=${encodeURIComponent(`/orders/${orderNo}`)}`, 302);
  const m = marketOf(order.market);
  const orderUrl = `${origin}${localize(`/orders/${encodeURIComponent(orderNo)}`, m)}`, k = keyQs(order, "&");
  if (!stripeEnabled() || order.paid || order.status !== "pending_payment" || m.payment !== "stripe") return Response.redirect(`${orderUrl}${keyQs(order)}`, 302);
  const items = await db.select({ name: schema.orderItems.name, qty: schema.orderItems.qty }).from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  try {
    const session = await createCheckoutSession({
      orderNo: order.orderNo, total: order.total, currency: order.currency, email: order.contactEmail,
      successUrl: `${orderUrl}?paid=1${k}`, cancelUrl: `${orderUrl}${keyQs(order)}`, description: items.map((i) => `${i.name} × ${i.qty}`).join(", "),
    });
    await db.update(schema.orders).set({ paymentRef: session.id.slice(0, 80) }).where(eq(schema.orders.id, order.id));
    return Response.redirect(session.url, 303);
  } catch (e) {
    console.error("[stripe] create session failed", order.orderNo, e);
    return Response.redirect(`${orderUrl}?payerr=1${k}`, 302);
  }
}
