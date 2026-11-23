import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { t } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { ecpayEnabled } from "@/lib/ecpay";
import { OrderDetail, StatusBadge } from "@/components/OrderDetail";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<{ new?: string; paid?: string }> }) {
  const { orderNo } = await params;
  const user = await requireUser(`/orders/${orderNo}`);
  const [order] = await db.select().from(schema.orders).where(and(eq(schema.orders.orderNo, orderNo), eq(schema.orders.userId, user.id)));
  if (!order) notFound();
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  const sp = await searchParams;
  const isNew = sp.new === "1", paidBack = sp.paid === "1";
  return (
    <div className="container-x py-10">
      {isNew && <p className="mb-6 rounded-2xl bg-forest px-5 py-4 text-white">{t.order.thanks}</p>}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">{t.order.no} {order.orderNo}</h1>
        <StatusBadge status={order.status} />
        <Link href="/account" className="ml-auto text-sm text-forest hover:underline">{t.order.myOrders} →</Link>
      </div>
      {paidBack && <p className="mb-6 rounded-2xl bg-forest px-5 py-4 text-white" data-testid="pay-result">{order.paid ? t.order.paidOk : t.order.paidPending}</p>}
      {!order.paid && order.status === "pending_payment" && ecpayEnabled() && (
        <div className="card mb-8 flex flex-wrap items-center justify-between gap-4 border-gold bg-gold/5 p-5" data-testid="pay-now">
          <div><div className="font-bold">{t.order.payOnline}</div><p className="mt-1 text-xs text-mute">{t.checkout.onlineHint}</p></div>
          <a href={`/api/ecpay/pay?orderNo=${order.orderNo}`} className="btn-primary px-6 py-3">{t.order.payNow}</a>
        </div>
      )}
      {!order.paid && order.status === "pending_payment" && !ecpayEnabled() && (
        <p className="card mb-8 border-gold bg-gold/5 p-5 text-sm">{t.checkout.onlineOff}</p>
      )}
      <OrderDetail order={order} items={items} />
    </div>
  );
}
