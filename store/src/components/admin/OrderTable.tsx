import Link from "@/components/Link";
import type { schema } from "@/db";
import { fmtDate, fmtMoney } from "@/lib/format";
import { StatusBadge } from "@/components/OrderDetail";

export function OrderTable({ orders, empty = "目前沒有訂單。" }: { orders: (typeof schema.orders.$inferSelect)[]; empty?: string }) {
  if (!orders.length) return <p className="text-sm text-mute">{empty}</p>;
  return (
    <div className="card divide-y divide-line">
      {orders.map((o) => (
        <Link key={o.id} href={`/admin/orders/${o.id}`} className={`flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm hover:bg-sand/60 ${o.paid ? "" : "text-mute"}`}>
          <span className={`w-[52px] shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-medium ${o.paid ? "bg-forest/10 text-forest" : "bg-gold/15 text-gold"}`}>{o.paid ? "已付款" : "未付款"}</span>
          <span className="font-medium text-ink">{o.orderNo}</span>
          <span className="text-mute">{fmtDate(o.createdAt)}</span>
          <span>{o.contactName}{o.company && `（${o.company}）`}</span>
          <StatusBadge status={o.status} />
          <span className="text-xs text-mute">{o.zoneName}</span>
          <span className={`ml-auto tabular-nums ${o.paid ? "font-bold text-ink" : ""}`}>{fmtMoney(o.total, o.currency)}</span>
        </Link>
      ))}
    </div>
  );
}
