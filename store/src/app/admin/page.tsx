import Link from "@/components/Link";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { fmtMoney } from "@/lib/format";
import { OrderTable } from "@/components/admin/OrderTable";

const { orders } = schema;
/** 已付款：收到款而且沒取消的訂單。未付款：還在等付款的訂單（不算進營收） */
const PAID = and(eq(orders.paid, true), ne(orders.status, "cancelled"));
const UNPAID = and(eq(orders.paid, false), eq(orders.status, "pending_payment"));

export default async function AdminHome() {
  const [byCurrency, [stats], [prod], paid, unpaid] = await Promise.all([
    // 各幣別分開統計，不同幣別的金額不能直接相加
    db.select({
      currency: orders.currency,
      paidTotal: sql<number>`coalesce(sum(case when paid = 1 and status != 'cancelled' then total end), 0)`,
      paidCount: sql<number>`coalesce(sum(case when paid = 1 and status != 'cancelled' then 1 end), 0)`,
      unpaidTotal: sql<number>`coalesce(sum(case when paid = 0 and status = 'pending_payment' then total end), 0)`,
      unpaidCount: sql<number>`coalesce(sum(case when paid = 0 and status = 'pending_payment' then 1 end), 0)`,
    }).from(orders).groupBy(orders.currency),
    db.select({
      reviewing: sql<number>`coalesce(sum(case when status = 'reviewing' then 1 end), 0)`,
      producing: sql<number>`coalesce(sum(case when status = 'in_production' then 1 end), 0)`,
      shipped: sql<number>`coalesce(sum(case when status = 'shipped' then 1 end), 0)`,
      unsent: sql<number>`coalesce(sum(case when paid = 1 and status = 'reviewing' and supplier_order_id is null then 1 end), 0)`,
    }).from(orders),
    db.select({ n: sql<number>`count(*)` }).from(schema.products).where(eq(schema.products.active, true)),
    db.select().from(orders).where(PAID).orderBy(desc(orders.id)).limit(8),
    db.select().from(orders).where(UNPAID).orderBy(desc(orders.id)).limit(8),
  ]);
  const rows = [...byCurrency].sort((a, b) => (a.currency === "TWD" ? -1 : b.currency === "TWD" ? 1 : a.currency.localeCompare(b.currency)));
  const paidCount = rows.reduce((a, r) => a + r.paidCount, 0), unpaidCount = rows.reduce((a, r) => a + r.unpaidCount, 0);
  const todo: [string, number, string][] = [
    ["待審稿", stats.reviewing, "/admin/orders?status=reviewing"], ["已付款未送供應商", stats.unsent, "/admin/orders?status=reviewing"],
    ["生產中", stats.producing, "/admin/orders?status=in_production"], ["已出貨", stats.shipped, "/admin/orders?status=shipped"],
  ];
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card border-forest/40 p-5" data-testid="paid-box">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">已付款營收</h2>
            <Link href="/admin/orders?pay=paid" className="text-xs text-forest hover:underline">{paidCount} 張訂單 →</Link>
          </div>
          <div className="mt-3 space-y-1.5">
            {rows.filter((r) => r.paidCount > 0).map((r) => (
              <div key={r.currency} className="flex items-baseline justify-between">
                <span className="serif text-2xl font-bold text-forest">{fmtMoney(r.paidTotal, r.currency)}</span>
                <span className="text-xs text-mute">{r.currency}・{r.paidCount} 張</span>
              </div>
            ))}
            {paidCount === 0 && <div className="serif text-2xl font-bold text-forest">{fmtMoney(0, "TWD")}</div>}
          </div>
          <p className="mt-3 text-xs text-mute">只計算已收到款項、且沒有取消的訂單。</p>
        </section>
        <section className="card border-gold/50 bg-gold/5 p-5" data-testid="unpaid-box">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">未付款（不計入營收）</h2>
            <Link href="/admin/orders?pay=unpaid" className="text-xs text-gold hover:underline">{unpaidCount} 張訂單 →</Link>
          </div>
          <div className="mt-3 space-y-1.5">
            {rows.filter((r) => r.unpaidCount > 0).map((r) => (
              <div key={r.currency} className="flex items-baseline justify-between">
                <span className="serif text-2xl font-bold text-gold">{fmtMoney(r.unpaidTotal, r.currency)}</span>
                <span className="text-xs text-mute">{r.currency}・{r.unpaidCount} 張</span>
              </div>
            ))}
            {unpaidCount === 0 && <div className="text-sm text-mute">目前沒有等待付款的訂單。</div>}
          </div>
          <p className="mt-3 text-xs text-mute">客戶已下單但還沒付款，可能不會完成。</p>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        {todo.map(([k, v, href]) => (
          <Link key={k} href={href} className="card p-4 hover:border-ink"><div className="text-xs text-mute">{k}</div><div className={`serif mt-1 text-2xl font-bold ${k === "已付款未送供應商" && v > 0 ? "text-danger" : "text-ink"}`}>{v}</div></Link>
        ))}
        <Link href="/admin/products" className="card p-4 hover:border-ink"><div className="text-xs text-mute">上架產品</div><div className="serif mt-1 text-2xl font-bold">{prod.n}</div></Link>
      </div>

      <div className="mt-10 mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">最新已付款訂單</h2>
        <Link href="/admin/orders?pay=paid" className="text-xs font-medium underline underline-offset-4">看全部</Link>
      </div>
      <OrderTable orders={paid} empty="還沒有已付款的訂單。" />

      <div className="mt-10 mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-mute">未付款訂單</h2>
        <Link href="/admin/orders?pay=unpaid" className="text-xs font-medium underline underline-offset-4">看全部</Link>
      </div>
      <OrderTable orders={unpaid} empty="目前沒有等待付款的訂單。" />
    </>
  );
}
