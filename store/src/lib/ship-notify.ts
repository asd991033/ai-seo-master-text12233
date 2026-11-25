import "server-only";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { site } from "@/config/site";
import { mailEnabled, sendMail } from "@/lib/mail";
import { setSetting } from "@/lib/settings";
import { shipMail } from "@/lib/ship-mail";

const { orders } = schema;
const BASELINE_KEY = "ship_mail_baseline";

/**
 * 定時工作：訂單出貨且有物流單號後，寄一封出貨通知信（每張訂單只寄一次）。
 * 第一次執行時，把當下已經出貨的舊訂單標成「已通知」，不會回頭補寄給早就收到貨的客戶。
 */
export async function sendShipNotices(now = Math.floor(Date.now() / 1000)): Promise<number> {
  const [baseline] = await db.select().from(schema.settings).where(eq(schema.settings.key, BASELINE_KEY));
  if (!baseline) {
    await db.update(orders).set({ shipMailAt: now }).where(and(inArray(orders.status, ["shipped", "completed"]), isNull(orders.shipMailAt)));
    await setSetting(BASELINE_KEY, String(now));
    return 0;
  }
  const origin = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  if (!mailEnabled() || !origin) return 0;
  const rows = await db.select().from(orders).where(and(eq(orders.status, "shipped"), eq(orders.paid, true), isNotNull(orders.trackingNo), isNull(orders.shipMailAt))).limit(100);
  let sent = 0;
  for (const o of rows) {
    if (!o.trackingNo?.trim()) continue;
    // 測試用的信箱不寄，直接標記避免每輪重查
    const skip = /@example\.(com|org|net)$|\.local$|\.invalid$/i.test(o.contactEmail);
    // 先記錄再寄，確保不會寄兩次；寄失敗就還原，下一輪再試
    const claimed = await db.update(orders).set({ shipMailAt: now }).where(and(eq(orders.id, o.id), isNull(orders.shipMailAt))).returning({ id: orders.id });
    if (!claimed.length || skip) continue;
    try {
      const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
      const mail = shipMail(o, items, origin, site.brand);
      await sendMail({ to: o.contactEmail, subject: mail.subject, html: mail.html, text: mail.text });
      sent++;
    } catch (e) {
      console.error("[ship-mail] send failed", o.orderNo, e);
      await db.update(orders).set({ shipMailAt: null }).where(eq(orders.id, o.id));
    }
  }
  return sent;
}
