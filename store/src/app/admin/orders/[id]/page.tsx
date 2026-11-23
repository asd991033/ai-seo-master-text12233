import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { t } from "@/i18n";
import { OrderDetail, StatusBadge } from "@/components/OrderDetail";
import { deleteOrder, updateOrder } from "../../actions";
import { sendToSupplier, syncSupplier } from "../../supplier-actions";
import { HC_STATUS, hicustomEnabled } from "@/lib/hicustom";

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
      {hicustomEnabled() && (
        <div className="card mb-8 space-y-3 p-4 text-sm" data-testid="supplier-box">
          <div className="flex flex-wrap items-center gap-3">
            <div className="font-bold">供應商（HiCustom）</div>
            {order.supplierOrderId ? <span className="rounded-full bg-forest/10 px-3 py-1 text-xs">{HC_STATUS[order.supplierStatus ?? 0] ?? "已送出"}</span> : <span className="rounded-full bg-gold/15 px-3 py-1 text-xs text-gold">尚未送單</span>}
          </div>
          {order.supplierOrderId && <div className="text-xs text-mute">HiCustom 訂單編號：<span className="font-medium text-ink">{order.supplierOrderId}</span>{order.supplierCost && `　成本：${order.supplierCost}`}</div>}
          {order.supplierNote && <p className="rounded-lg bg-sand px-3 py-2 text-xs leading-relaxed">{order.supplierNote}</p>}
          {order.supplierOrderId ? (
            <form action={syncSupplier} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={order.id} />
              <button className="btn-primary">同步狀態與物流單號</button>
              <a href="https://jit.hicustom.com/merchant" target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-4">前往 HiCustom 後台付款</a>
            </form>
          ) : (
            <form action={sendToSupplier} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={order.id} />
              <label><span className="label">郵遞區號</span><input name="postcode" defaultValue={order.postcode ?? ""} inputMode="numeric" className="input w-28" placeholder="例 110" /></label>
              <label><span className="label">物流方式名稱（選填）</span><input name="logistics" defaultValue={process.env.HICUSTOM_LOGISTICS ?? ""} className="input w-44" placeholder="留空用 HiCustom 預設" /></label>
              <button className="btn-primary">送到 HiCustom</button>
              <span className="text-xs text-mute">會上傳印刷檔、合成商品並建立訂單；建立後需到 HiCustom 後台付款才會生產。{!order.paid && "（這張訂單客戶尚未付款）"}</span>
            </form>
          )}
        </div>
      )}
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
      <details className="mt-10 text-xs text-mute">
        <summary className="cursor-pointer">刪除這張訂單</summary>
        <form action={deleteOrder} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={order.id} />
          <label><span className="label">輸入訂單編號 {order.orderNo} 以確認（刪除後無法復原）</span><input name="confirm" className="input w-56" autoComplete="off" /></label>
          <button className="rounded-[12px] border border-danger px-4 py-2 text-danger hover:bg-danger hover:text-white">永久刪除</button>
        </form>
      </details>
    </>
  );
}
