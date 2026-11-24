import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { t } from "@/i18n";
import { stripeEnabled } from "@/lib/stripe";
import { marketOf } from "@/config/markets";
import { initMarket } from "@/market/server";
import { getUser, requireUser } from "@/lib/auth";
import { keyQs, orderFor } from "@/lib/order-access";
import { checkOrderPayment } from "@/lib/stripe-sync";
import { ecpayEnabled } from "@/lib/ecpay";
import { PurchaseEvent } from "@/components/PurchaseEvent";
import { OrderDetail, StatusBadge } from "@/components/OrderDetail";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<{ new?: string; paid?: string; key?: string }> }) {
  await initMarket();
  const { orderNo } = await params;
  const sp = await searchParams;
  // 訂單本人（已登入）或帶著訂單專屬連結的訪客才能看
  const found = await orderFor(orderNo, sp.key);
  if (!found) { await requireUser(`/orders/${orderNo}`); notFound(); }
  // 客戶剛從 Stripe 付款頁回來：直接向 Stripe 查證，不必等通知送到
  const order = sp.paid === "1" && !found.paid && (await checkOrderPayment(found)) ? (await orderFor(orderNo, sp.key)) ?? found : found;
  const guest = !(await getUser()), k = keyQs(order, "&");
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  const isNew = sp.new === "1", paidBack = sp.paid === "1";
  const stripe = marketOf(order.market).payment === "stripe", canPay = stripe ? stripeEnabled() : ecpayEnabled();
  return (
    <div className="container-x py-10">
      {isNew && <p className="mb-6 rounded-2xl bg-forest px-5 py-4 text-white">{t.order.thanks}</p>}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">{t.order.no} {order.orderNo}</h1>
        <StatusBadge status={order.status} />
        {!guest && <Link href="/account" className="ml-auto text-sm text-forest hover:underline">{t.order.myOrders} →</Link>}
      </div>
      {guest && <p className="mb-6 rounded-2xl border border-line bg-sand px-5 py-4 text-sm" data-testid="guest-note">{t.order.guestNote}</p>}
      {paidBack && <p className="mb-6 rounded-2xl bg-forest px-5 py-4 text-white" data-testid="pay-result">{order.paid ? t.order.paidOk : t.order.paidPending}</p>}
      {!order.paid && order.status === "pending_payment" && canPay && (
        <div className="card mb-8 flex flex-wrap items-center justify-between gap-4 border-gold bg-gold/5 p-5" data-testid="pay-now">
          <div><div className="font-bold">{t.order.payOnline}</div><p className="mt-1 text-xs text-mute">{t.checkout.onlineHint}</p></div>
          <a href={`/api/${stripe ? "stripe" : "ecpay"}/pay?orderNo=${order.orderNo}${k}`} className="btn-primary px-6 py-3">{t.order.payNow}</a>
        </div>
      )}
      {!order.paid && order.status === "pending_payment" && !canPay && (
        <p className="card mb-8 border-gold bg-gold/5 p-5 text-sm">{t.checkout.onlineOff}</p>
      )}
      {order.paid && (
        <PurchaseEvent orderNo={order.orderNo} value={order.total} shipping={order.shippingFee} currency={order.currency}
          adsSendTo={process.env.GADS_ID && process.env.GADS_PURCHASE_LABEL ? `${process.env.GADS_ID}/${process.env.GADS_PURCHASE_LABEL}` : null}
          items={items.map((i) => ({ item_id: i.sku, item_name: i.name, quantity: i.qty, price: i.unitPrice }))} />
      )}
      <OrderDetail order={order} items={items} />
    </div>
  );
}
