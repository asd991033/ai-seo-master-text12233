import Link from "@/components/Link";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { fmtDate } from "@/lib/format";
import { Stars } from "@/components/Stars";
import { ReviewImport } from "@/components/admin/ReviewImport";
import { addReview, deleteReview, setReviewStatus } from "../review-actions";

const TABS = [["pending", "待審核"], ["published", "已公開"], ["hidden", "已隱藏"]] as const;
const SOURCE: Record<string, string> = { customer: "買家填寫", import: "Excel 匯入", admin: "後台代登" };
const LIMIT = 200;

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string; msg?: string }> }) {
  const sp = await searchParams;
  const status = TABS.find(([k]) => k === sp.status)?.[0] ?? "pending";
  const [rows, counts] = await Promise.all([
    db
      .select({ r: schema.reviews, productName: schema.products.name, sku: schema.products.sku, slug: schema.products.slug, orderNo: schema.orders.orderNo })
      .from(schema.reviews)
      .innerJoin(schema.products, eq(schema.products.id, schema.reviews.productId))
      .leftJoin(schema.orders, eq(schema.orders.id, schema.reviews.orderId))
      .where(eq(schema.reviews.status, status))
      .orderBy(desc(schema.reviews.createdAt), desc(schema.reviews.id))
      .limit(LIMIT),
    db.select({ status: schema.reviews.status, n: sql<number>`count(*)` }).from(schema.reviews).groupBy(schema.reviews.status),
  ]);
  const countOf = (s: string) => Number(counts.find((c) => c.status === s)?.n ?? 0);
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">商品評價</h1>
      <p className="mb-6 text-sm text-mute">買家在訂單頁寫的評價會先進「待審核」，公開後才顯示在商品頁。對得到本站訂單的評價會標示「已驗證購買」。</p>
      {sp.msg && <p className="mb-6 rounded-lg bg-sand p-3 text-sm" role="status">{sp.msg}</p>}

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <ReviewImport />
        <form action={addReview} className="card space-y-3 p-6 text-sm">
          <h2 className="text-lg font-bold">單筆新增</h2>
          <p className="leading-relaxed text-mute">代登買家透過 Email、LINE 等傳來的評價，請照原文填寫。有填訂單編號才會標示「已驗證購買」。</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="label">SKU *</span><input name="sku" required className="input" /></label>
            <label><span className="label">訂單編號（選填）</span><input name="orderNo" className="input" /></label>
            <label><span className="label">評價者名稱 *</span><input name="authorName" required maxLength={60} className="input" /></label>
            <label><span className="label">星等 *</span>
              <select name="rating" required defaultValue="5" className="input">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} 星</option>)}</select>
            </label>
            <label><span className="label">標題</span><input name="title" maxLength={120} className="input" /></label>
            <label><span className="label">評價日期</span><input name="date" type="date" className="input" /></label>
          </div>
          <label className="block"><span className="label">評價內容 *</span><textarea name="body" required maxLength={2000} rows={4} className="input" /></label>
          <button className="btn-primary">新增評價</button>
        </form>
      </div>

      <nav className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([k, label]) => <Link key={k} href={`/admin/reviews?status=${k}`} className={k === status ? "chip-on" : "chip"}>{label}（{countOf(k)}）</Link>)}
      </nav>
      {rows.length === 0 ? <p className="card p-6 text-sm text-mute">這個分類目前沒有評價。</p> : (
        <ul className="space-y-3">
          {rows.map(({ r, productName, sku, slug, orderNo }) => (
            <li key={r.id} className="card p-4 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars value={r.rating} label={`${r.rating} 星`} />
                <span className="font-medium">{r.authorName}</span>
                {r.verified && <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs text-forest">已驗證購買</span>}
                <span className="text-xs text-mute">{SOURCE[r.source] ?? r.source}・{fmtDate(r.createdAt)}{orderNo && <>・訂單 {orderNo}</>}</span>
              </div>
              <div className="mt-1 text-xs text-mute"><Link href={`/products/${slug}`} className="hover:text-forest">{productName}</Link>（{sku}）</div>
              {r.title && <div className="mt-2 font-bold">{r.title}</div>}
              <p className="mt-1 whitespace-pre-line leading-relaxed">{r.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TABS.filter(([k]) => k !== status && k !== "pending").map(([k]) => (
                  <form key={k} action={setReviewStatus}>
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value={k} />
                    <button className={k === "published" ? "btn-primary py-1.5" : "btn-ghost py-1.5"}>{k === "published" ? "公開" : "隱藏"}</button>
                  </form>
                ))}
                <form action={deleteReview}><input type="hidden" name="id" value={r.id} /><button className="btn-ghost py-1.5 text-danger">刪除</button></form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {rows.length === LIMIT && <p className="mt-4 text-xs text-mute">只顯示最新 {LIMIT} 則。</p>}
    </>
  );
}
