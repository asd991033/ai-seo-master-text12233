import "server-only";
import { and, eq, gt, isNotNull, isNull, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { purchasePayload, trackingFromCookies } from "./ga-track";

export { purchasePayload, trackingFromCookies };

/**
 * 伺服器補送「購買」事件：已付款超過 20 分鐘、但瀏覽器沒有送出過轉換的訂單
 * （ATM／超商付款的客戶繳費後通常不會回到網站；或追蹤碼被瀏覽器擋掉）。
 * 需要 GA_ID 與 GA_API_SECRET（GA4 後台 → 管理 → 資料串流 → Measurement Protocol API 密鑰）。
 */
export async function sendMissedPurchases(now = Math.floor(Date.now() / 1000)): Promise<number> {
  const id = process.env.GA_ID?.trim(), secret = process.env.GA_API_SECRET?.trim();
  if (!id || !secret) return 0;
  const { orders } = schema;
  // GA4 只接受 72 小時內的事件，所以只補最近三天付款的
  const rows = await db.select().from(orders)
    .where(and(eq(orders.paid, true), isNull(orders.trackedAt), isNotNull(orders.paidAt), lt(orders.paidAt, now - 20 * 60), gt(orders.paidAt, now - 70 * 3600))).limit(50);
  let n = 0;
  for (const o of rows) {
    // 先搶下這張訂單再送，避免和瀏覽器同時送出
    const claimed = await db.update(orders).set({ trackedAt: now }).where(and(eq(orders.id, o.id), isNull(orders.trackedAt))).returning({ id: orders.id });
    if (!claimed.length) continue;
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
    try {
      const res = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(id)}&api_secret=${encodeURIComponent(secret)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...purchasePayload(o, items), timestamp_micros: (o.paidAt ?? now) * 1_000_000 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      n++;
    } catch (e) {
      console.error("[ga] server purchase failed", o.orderNo, e);
      await db.update(orders).set({ trackedAt: null }).where(eq(orders.id, o.id));
    }
  }
  return n;
}
