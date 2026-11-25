"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { initMarket } from "@/market/server";
import { localize } from "@/config/markets";
import { keyQs, orderFor } from "@/lib/order-access";
import { canReviewOrder, cleanReview } from "@/lib/review-rules";

/** 買家在訂單頁送出評價：只有訂單本人（或持訂單專屬連結）、訂單已出貨、且買過這件商品才能寫，一件商品一則 */
export async function submitReview(fd: FormData) {
  const m = await initMarket();
  const orderNo = String(fd.get("orderNo") ?? ""), key = String(fd.get("key") ?? "") || null, productId = Number(fd.get("productId")) || 0;
  const order = await orderFor(orderNo, key);
  if (!order) redirect(localize("/account", m));
  const back = (flag: string): never => redirect(`${localize(`/orders/${order.orderNo}`, m)}${keyQs(order)}${order.accessKey ? "&" : "?"}review=${flag}#reviews`);
  const cleaned = cleanReview({ authorName: fd.get("authorName"), rating: fd.get("rating"), title: fd.get("title"), body: fd.get("body") });
  if (!canReviewOrder(order) || !cleaned.ok) return back("failed");
  const [item] = await db.select({ id: schema.orderItems.id }).from(schema.orderItems).where(and(eq(schema.orderItems.orderId, order.id), eq(schema.orderItems.productId, productId)));
  if (!item) back("failed");
  await db.insert(schema.reviews).values({ ...cleaned.value, productId, orderId: order.id, status: "pending", source: "customer", verified: true }).onConflictDoNothing();
  back("sent");
}
