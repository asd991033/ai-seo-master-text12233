"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { removeDuplicateReviews } from "@/lib/reviews";
import { canReviewOrder, cleanReview, parseReviewDate } from "@/lib/review-rules";

const STATUSES = ["pending", "published", "hidden"] as const;

export async function setReviewStatus(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  const status = STATUSES.find((s) => s === fd.get("status"));
  if (!id || !status) return;
  await db.update(schema.reviews).set({ status }).where(eq(schema.reviews.id, id));
  revalidatePath("/admin/reviews");
}

export async function deleteReview(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  if (id) await db.delete(schema.reviews).where(eq(schema.reviews.id, id));
  revalidatePath("/admin/reviews");
}

/**
 * 後台單筆代登（例如買家用 Email、LINE 傳來的評價）。
 * 有填訂單編號且對得上已出貨訂單的商品，才會標示「已驗證購買」；沒填的照常顯示但不帶標示。
 */
export async function addReview(fd: FormData) {
  await requireAdmin();
  const back = (msg: string): never => redirect(`/admin/reviews?msg=${encodeURIComponent(msg)}`);
  const sku = String(fd.get("sku") ?? "").trim(), orderNo = String(fd.get("orderNo") ?? "").trim();
  const [product] = sku ? await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.sku, sku)) : [];
  if (!product) back(`找不到 SKU「${sku}」`);
  const cleaned = cleanReview({ authorName: fd.get("authorName"), rating: fd.get("rating"), title: fd.get("title"), body: fd.get("body") });
  if (!cleaned.ok) return back(cleaned.error);
  const nowSec = Math.floor(Date.now() / 1000), date = parseReviewDate(fd.get("date"));
  if (date === null || (date !== undefined && date > nowSec)) back("評價日期格式錯誤或是未來日期");
  let orderId: number | null = null;
  if (orderNo) {
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.orderNo, orderNo));
    if (!order) return back(`找不到訂單 ${orderNo}`);
    if (!canReviewOrder(order)) back(`訂單 ${orderNo} 尚未付款或尚未出貨`);
    const [item] = await db.select({ id: schema.orderItems.id }).from(schema.orderItems).where(and(eq(schema.orderItems.orderId, order.id), eq(schema.orderItems.productId, product.id)));
    if (!item) back(`訂單 ${orderNo} 裡沒有這件商品`);
    const [dup] = await db.select({ id: schema.reviews.id }).from(schema.reviews).where(and(eq(schema.reviews.orderId, order.id), eq(schema.reviews.productId, product.id)));
    if (dup) back(`訂單 ${orderNo} 的這件商品已經有評價`);
    orderId = order.id;
  }
  await db.insert(schema.reviews).values({ ...cleaned.value, productId: product.id, orderId, status: "published", source: "admin", verified: orderId != null, createdAt: date ?? nowSec });
  revalidatePath("/admin/reviews");
  back("已新增評價");
}

export async function dedupeReviews() {
  await requireAdmin();
  const n = await removeDuplicateReviews();
  revalidatePath("/", "layout");
  redirect(`/admin/reviews?msg=${encodeURIComponent(n ? `已清除 ${n} 則重複的評價` : "沒有重複的評價")}`);
}

/** 評價者名稱包含關鍵字（不分大小寫）的條件；後台搜尋與整批刪除共用 */
const nameHas = (q: string) => sql`instr(lower(${schema.reviews.authorName}), ${q.toLowerCase()}) > 0`;

/** 刪除評價者名稱包含關鍵字的全部評價（不分狀態） */
export async function deleteReviewsByName(fd: FormData) {
  await requireAdmin();
  const q = String(fd.get("q") ?? "").trim();
  if (q.length < 2) redirect(`/admin/reviews?msg=${encodeURIComponent("關鍵字至少要 2 個字")}`);
  const gone = await db.delete(schema.reviews).where(nameHas(q)).returning({ id: schema.reviews.id });
  revalidatePath("/", "layout");
  redirect(`/admin/reviews?msg=${encodeURIComponent(`已刪除 ${gone.length} 則評價者名稱含「${q}」的評價`)}`);
}
