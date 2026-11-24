import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { orderFor } from "@/lib/order-access";
import { marketOf } from "@/config/markets";

export const dynamic = "force-dynamic";

/** 提醒信裡的「不要再提醒」連結：帶著訂單專屬的 key 才有效 */
async function stop(req: Request) {
  const sp = new URL(req.url).searchParams;
  const order = await orderFor((sp.get("orderNo") ?? "").slice(0, 30), sp.get("key"));
  if (order) await db.update(schema.orders).set({ remindStopped: true }).where(eq(schema.orders.id, order.id));
  const en = order ? marketOf(order.market).locale === "en" : false;
  const msg = !order ? "Link not valid. 連結無效。" : en ? "Done. We will not send any more reminders for this order." : "已停止提醒，這張訂單不會再寄信給你。";
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Kindmark</title></head><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#1f1e1b"><p>${msg}</p></body></html>`, { status: order ? 200 : 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
export const GET = stop;
export const POST = stop;
