import "server-only";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { site } from "@/config/site";
import { mailEnabled, sendMail } from "@/lib/mail";
import { REMIND_AFTER_HOURS, REMIND_MAX_DAYS, dueReminder, recoverMail } from "@/lib/recover-mail";

const { orders } = schema;

/**
 * 定時工作：寄信提醒「已送出訂單但還沒付款」的客戶（下單後 1、24、72 小時各一封，最多三封）。
 * 已付款、已取消、客戶按了停止提醒、或超過 7 天的訂單都不會寄。
 */
export async function sendPaymentReminders(now = Math.floor(Date.now() / 1000)): Promise<number> {
  const origin = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  if (!mailEnabled() || !origin) return 0;
  const rows = await db.select().from(orders)
    .where(and(eq(orders.paid, false), eq(orders.status, "pending_payment"), eq(orders.remindStopped, false), lt(orders.remindCount, REMIND_AFTER_HOURS.length), gt(orders.createdAt, now - REMIND_MAX_DAYS * 86400))).limit(100);
  let sent = 0;
  for (const o of rows) {
    const n = dueReminder(o, now);
    // 測試用的信箱不寄
    if (!n || /@example\.(com|org|net)$|\.local$|\.invalid$/i.test(o.contactEmail)) continue;
    // 先記錄再寄，確保同一封不會寄兩次；寄失敗就還原，下一輪再試
    const claimed = await db.update(orders).set({ remindCount: n, remindAt: now }).where(and(eq(orders.id, o.id), eq(orders.remindCount, o.remindCount), eq(orders.paid, false))).returning({ id: orders.id });
    if (!claimed.length) continue;
    try {
      const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
      const mail = recoverMail(o, items, n, origin, site.brand);
      await sendMail({ to: o.contactEmail, subject: mail.subject, html: mail.html, text: mail.text, headers: { "List-Unsubscribe": `<${mail.stopUrl}>` } });
      sent++;
    } catch (e) {
      console.error("[recover] send failed", o.orderNo, e);
      await db.update(orders).set({ remindCount: o.remindCount, remindAt: o.remindAt }).where(eq(orders.id, o.id));
    }
  }
  return sent;
}
