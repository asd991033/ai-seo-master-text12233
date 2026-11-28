import "server-only";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { localize, marketOf } from "@/config/markets";
import { metaPurchaseEvent } from "./meta-track";

/**
 * Meta 轉換 API（伺服器端）。環境變數：
 *   META_PIXEL_ID：像素（資料集）編號；META_CAPI_TOKEN：轉換 API 存取權杖（沒設定就不送）
 *   META_TEST_EVENT_CODE：事件管理工具「測試事件」的代碼，驗收時暫時填上，事件會出現在測試頁
 */
export const metaPixelId = () => process.env.META_PIXEL_ID?.trim() || (process.env.NODE_ENV === "production" ? "1621450962523965" : "");
const cfg = () => {
  const id = metaPixelId(), token = process.env.META_CAPI_TOKEN?.trim();
  return id && token ? { id, token, test: process.env.META_TEST_EVENT_CODE?.trim() || undefined } : null;
};

const { orders } = schema;

/** 付款成功後由伺服器送出 Purchase；每張訂單只送一次，event_id 與瀏覽器端相同讓 Meta 去重 */
export async function sendMetaPurchase(orderId: number, now = Math.floor(Date.now() / 1000)): Promise<boolean> {
  const c = cfg();
  if (!c) return false;
  // 先搶下這張訂單再送，避免同時送兩次；失敗就還原，下一輪再試
  const [o] = await db.update(orders).set({ metaSentAt: now }).where(and(eq(orders.id, orderId), eq(orders.paid, true), isNull(orders.metaSentAt))).returning();
  if (!o) return false;
  try {
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
    const origin = (process.env.SITE_URL ?? "").replace(/\/$/, "");
    const event = metaPurchaseEvent(o, items, `${origin}${localize(`/orders/${o.orderNo}`, marketOf(o.market))}`, now);
    const res = await fetch(`${(process.env.META_GRAPH_BASE?.trim() || "https://graph.facebook.com/v21.0").replace(/\/$/, "")}/${encodeURIComponent(c.id)}/events?access_token=${encodeURIComponent(c.token)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event], ...(c.test ? { test_event_code: c.test } : {}) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return true;
  } catch (e) {
    console.error("[meta] purchase failed", o.orderNo, (e as Error).message);
    await db.update(orders).set({ metaSentAt: null }).where(eq(orders.id, o.id));
    return false;
  }
}

/** 定時補送：已付款但還沒送過的訂單（付款通知當下送失敗、或服務剛好重啟）。Meta 只收 7 天內的事件 */
export async function sendPendingMetaPurchases(now = Math.floor(Date.now() / 1000)): Promise<number> {
  if (!cfg()) return 0;
  const rows = await db.select({ id: orders.id }).from(orders)
    .where(and(eq(orders.paid, true), isNull(orders.metaSentAt), isNotNull(orders.paidAt), gt(orders.paidAt, now - 6 * 86400))).limit(50);
  let n = 0;
  for (const r of rows) if (await sendMetaPurchase(r.id, now)) n++;
  return n;
}
