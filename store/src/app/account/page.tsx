import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { t } from "@/i18n";
import { fmtDate, fmtMoney } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { StatusBadge } from "@/components/OrderDetail";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t.nav.account };

export default async function AccountPage() {
  const user = await requireUser();
  const orders = await db.select().from(schema.orders).where(eq(schema.orders.userId, user.id)).orderBy(desc(schema.orders.id));
  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-bold">{t.auth.hello(user.name)}</h1>
        <form action={logoutAction} className="ml-auto"><button className="btn-ghost">{t.nav.logout}</button></form>
      </div>
      <p className="mt-2 text-sm text-mute">{user.email}{user.company && `・${user.company}`}</p>
      <h2 className="mt-10 mb-4 text-xl font-bold">{t.order.myOrders}</h2>
      {orders.length ? (
        <div className="card divide-y divide-line">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.orderNo}`} className="flex flex-wrap items-center gap-4 p-4 text-sm hover:bg-sand/60">
              <span className="font-medium">{o.orderNo}</span>
              <span className="text-mute">{fmtDate(o.createdAt)}</span>
              <StatusBadge status={o.status} />
              <span className="ml-auto font-bold tabular-nums">{fmtMoney(o.total)}</span>
              <span className="text-forest">{t.order.view} →</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-mute">{t.order.none} <Link href="/products" className="text-forest hover:underline">{t.cart.goShop}</Link></p>
      )}
    </div>
  );
}
