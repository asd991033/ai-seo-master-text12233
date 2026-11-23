import Link from "@/components/Link";
import type { schema } from "@/db";
import { fmtDate, fmtMoney } from "@/lib/format";
import { StatusBadge } from "@/components/OrderDetail";

export function OrderTable({ orders }: { orders: (typeof schema.orders.$inferSelect)[] }) {
  if (!orders.length) return <p className="text-mute">目前沒有訂單。</p>;
  return (
    <div className="card divide-y divide-line">
      {orders.map((o) => (
        <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-4 p-4 text-sm hover:bg-sand/60">
          <span className="font-medium">{o.orderNo}</span>
          <span className="text-mute">{fmtDate(o.createdAt)}</span>
          <span>{o.contactName}{o.company && `（${o.company}）`}</span>
          <StatusBadge status={o.status} />
          <span className="text-xs text-mute">{o.zoneName}</span>
          <span className="ml-auto font-bold tabular-nums">{fmtMoney(o.total, o.currency)}</span>
        </Link>
      ))}
    </div>
  );
}
