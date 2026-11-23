import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { fmtMoney } from "@/lib/format";
import { OrderTable } from "@/components/admin/OrderTable";

export default async function AdminHome() {
  const [[stats], [prod], recent] = await Promise.all([
    db.select({
      orders: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(case when status != 'cancelled' and currency = 'TWD' then total end), 0)`,
      pending: sql<number>`coalesce(sum(case when status = 'pending_payment' then 1 end), 0)`,
      reviewing: sql<number>`coalesce(sum(case when status = 'reviewing' then 1 end), 0)`,
    }).from(schema.orders),
    db.select({ n: sql<number>`count(*)` }).from(schema.products),
    db.select().from(schema.orders).orderBy(desc(schema.orders.id)).limit(8),
  ]);
  const cards: [string, string][] = [["訂單總數", String(stats.orders)], ["累計金額（台灣站）", fmtMoney(stats.revenue, "TWD")], ["待付款", String(stats.pending)], ["待審稿", String(stats.reviewing)], ["產品數", String(prod.n)]];
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {cards.map(([k, v]) => (
          <div key={k} className="card p-4"><div className="text-xs text-mute">{k}</div><div className="serif mt-1 text-2xl font-bold text-forest">{v}</div></div>
        ))}
      </div>
      <h2 className="mt-10 mb-4 text-lg font-bold">最新訂單</h2>
      <OrderTable orders={recent} />
    </>
  );
}
