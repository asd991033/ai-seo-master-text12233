"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
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
