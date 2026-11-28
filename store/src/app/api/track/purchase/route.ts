import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { orderFor } from "@/lib/order-access";
import { sendMetaPurchase } from "@/lib/meta-server";

/** 瀏覽器送出「購買」轉換後回報，記下時間，避免伺服器重複補送 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { orderNo?: unknown; key?: unknown } | null;
  const order = await orderFor(String(body?.orderNo ?? "").slice(0, 30), typeof body?.key === "string" ? body.key : null);
  if (!order?.paid) return new Response(null, { status: 404 });
  await db.update(schema.orders).set({ trackedAt: Math.floor(Date.now() / 1000) }).where(and(eq(schema.orders.id, order.id), isNull(schema.orders.trackedAt)));
  // 客戶回到訂單頁時順便由伺服器送出 Meta 的 Purchase（和瀏覽器事件用同一個 ID 去重）
  void sendMetaPurchase(order.id).catch(() => {});
  return new Response(null, { status: 204 });
}
