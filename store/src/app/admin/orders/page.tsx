import Link from "@/components/Link";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { t } from "@/i18n";
import { OrderTable } from "@/components/admin/OrderTable";

const { orders } = schema;
type Status = (typeof orders.$inferSelect)["status"];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; pay?: string }> }) {
  const sp = await searchParams;
  // 預設看已付款的訂單；未付款另外一頁，避免混在一起
  const pay = sp.pay === "unpaid" || sp.pay === "all" ? sp.pay : "paid";
  const status = Object.keys(t.order.statuses).find((s) => s === sp.status) as Status | undefined;
  const conds: SQL[] = [];
  if (pay === "paid") conds.push(eq(orders.paid, true));
  if (pay === "unpaid") conds.push(eq(orders.paid, false));
  if (status) conds.push(eq(orders.status, status));
  const [list, [n]] = await Promise.all([
    db.select().from(orders).where(conds.length ? and(...conds) : undefined).orderBy(desc(orders.id)).limit(300),
    db.select({ paid: sql<number>`coalesce(sum(paid), 0)`, unpaid: sql<number>`coalesce(sum(case when paid = 0 then 1 end), 0)`, all: sql<number>`count(*)` }).from(orders),
  ]);
  const href = (p: string, s?: string) => `/admin/orders?pay=${p}${s ? `&status=${s}` : ""}`;
  const tabs: [string, string, number][] = [["paid", "已付款", n.paid], ["unpaid", "未付款", n.unpaid], ["all", "全部", n.all]];
  // 已付款的訂單不會是「待付款」，未付款的訂單只會是待付款或已取消
  const statuses = Object.entries(t.order.statuses).filter(([k]) => (pay === "paid" ? k !== "pending_payment" : pay === "unpaid" ? k === "pending_payment" || k === "cancelled" : true));
  return (
    <>
      <div className="mb-5 flex gap-1 border-b border-line" data-testid="pay-tabs">
        {tabs.map(([k, label, count]) => (
          <Link key={k} href={href(k)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${pay === k ? "border-ink font-bold" : "border-transparent text-mute hover:text-ink"}`}>
            {label}<span className="ml-1.5 text-xs text-mute">{count}</span>
          </Link>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href={href(pay)} className={status ? "chip" : "chip-on"}>全部狀態</Link>
        {statuses.map(([k, v]) => <Link key={k} href={href(pay, k)} className={status === k ? "chip-on" : "chip"}>{v}</Link>)}
      </div>
      {pay === "unpaid" && <p className="mb-4 text-xs text-mute">這些訂單還沒收到款項，不計入營收，也不會送給供應商生產。</p>}
      <OrderTable orders={list} empty={pay === "unpaid" ? "目前沒有未付款的訂單。" : "目前沒有訂單。"} />
    </>
  );
}
