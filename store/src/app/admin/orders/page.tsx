import Link from "@/components/Link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { t } from "@/i18n";
import { OrderTable } from "@/components/admin/OrderTable";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const valid = Object.keys(t.order.statuses).find((s) => s === status) as (typeof schema.orders.$inferSelect)["status"] | undefined;
  const orders = await db.select().from(schema.orders).where(valid ? eq(schema.orders.status, valid) : undefined).orderBy(desc(schema.orders.id)).limit(300);
  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/admin/orders" className={valid ? "chip" : "chip-on"}>全部</Link>
        {Object.entries(t.order.statuses).map(([k, v]) => (
          <Link key={k} href={`/admin/orders?status=${k}`} className={valid === k ? "chip-on" : "chip"}>{v}</Link>
        ))}
      </div>
      <OrderTable orders={orders} />
    </>
  );
}
