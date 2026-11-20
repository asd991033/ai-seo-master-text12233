import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { t } from "@/i18n";
import { OrderDetail, StatusBadge } from "@/components/OrderDetail";
import { updateOrder } from "../../actions";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [order] = Number.isInteger(id) ? await db.select().from(schema.orders).where(eq(schema.orders.id, id)) : [];
  if (!order) notFound();
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  const designIds = items.map((i) => i.designId).filter((x): x is string => !!x);
  const designs = designIds.length ? await db.select().from(schema.designs).where(inArray(schema.designs.id, designIds)) : [];
  const link = "rounded-full border border-line bg-white px-3 py-1 hover:border-ink";
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">訂單 {order.orderNo}</h1>
        <StatusBadge status={order.status} />
      </div>
      <form action={updateOrder} className="card mb-8 flex flex-wrap items-end gap-4 p-4 text-sm">
        <input type="hidden" name="id" value={order.id} />
        <label><span className="label">狀態</span>
          <select name="status" defaultValue={order.status} className="input w-auto">
            {Object.entries(t.order.statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label><span className="label">物流單號</span><input name="trackingNo" defaultValue={order.trackingNo ?? ""} className="input" /></label>
        <label className="flex items-center gap-2 pb-2"><input type="checkbox" name="paid" defaultChecked={order.paid} className="accent-[var(--color-forest)]" />已收款</label>
        <button className="btn-primary">更新訂單</button>
      </form>
      <OrderDetail
        order={order}
        items={items}
        extra={(it) => {
          const design = designs.find((d) => d.id === it.designId);
          if (!design && !it.artworkUrl) return it.breakdown && (it.breakdown as { labels: string[] }).labels.length ? <p className="mt-3 text-xs text-gold">客戶尚未提供稿件</p> : null;
          return (
            <div className="mt-4 space-y-2 border-t border-line pt-3 text-xs">
              {it.artworkUrl && <a href={it.artworkUrl} download className={link}>下載客戶上傳稿件</a>}
              {design && Object.entries(design.data).map(([code, d]) => (
                <div key={code} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{code}／{d.areaCode}</span>
                  {d.printUrl && <a href={d.printUrl} download className={link}>印刷檔 PNG</a>}
                  {d.svgUrl && <a href={d.svgUrl} download className={link}>向量 SVG</a>}
                  {d.mockupUrl && <a href={d.mockupUrl} target="_blank" className={link}>示意圖</a>}
                </div>
              ))}
            </div>
          );
        }}
      />
    </>
  );
}
