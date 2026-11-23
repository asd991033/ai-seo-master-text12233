import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { t } from "@/i18n";
import { stripeEnabled } from "@/lib/stripe";
import { marketOf } from "@/config/markets";
import { initMarket } from "@/market/server";
import { requireUser } from "@/lib/auth";
import { ecpayEnabled } from "@/lib/ecpay";
import { PurchaseEvent } from "@/components/PurchaseEvent";
import { OrderDetail, StatusBadge } from "@/components/OrderDetail";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<{ new?: string; paid?: string }> }) {
  await initMarket();
  await initMarket();
  const { orderNo } = await params;
  const user = await requireUser(`/orders/${orderNo}`);
  const [order] = await db.select().from(schema.orders).where(and(eq(schema.orders.orderNo, orderNo), eq(schema.orders.userId, user.id)));
  if (!order) notFound();
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  const sp = await searchParams;
  const isNew = sp.new === "1", paidBack = sp.paid === "1";
  const stripe = marketOf(order.market).payment === "stripe", canPay = stripe ? stripeEnabled() : ecpayEnabled();
  return (
    <div className="container-x py-10">
      {isNew && <p className="mb-6 rounded-2xl bg-forest px-5 py-4 text-white">{t.order.thanks}</p>}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">{t.order.no} {order.orderNo}</h1>
        <StatusBadge status={order.status} />
        <Link href="/account" className="ml-auto text-sm text-forest hover:underline">{t.order.myOrders} →</Link>
      </div>
      {paidBack && <p className="mb-6 rounded-2xl bg-forest px-5 py-4 text-white" data-testid="pay-result">{order.paid ? t.order.paidOk : t.order.paidPending}</p>}
      {!order.paid && order.status === "pending_payment" && canPay && (
        <div className="card mb-8 flex flex-wrap items-center justify-between gap-4 border-gold bg-gold/5 p-5" data-testid="pay-now">
          <div><div className="font-bold">{t.order.payOnline}</div><p className="mt-1 text-xs text-mute">{t.checkout.onlineHint}</p></div>
          <a href={`/api/${stripe ? "stripe" : "ecpay"}/pay?orderNo=${order.orderNo}`} className="btn-primary px-6 py-3">{t.order.payNow}</a>
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
