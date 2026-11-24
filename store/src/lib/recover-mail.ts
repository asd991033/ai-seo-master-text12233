import { localize, marketOf, moneyFmtOf } from "@/config/markets";

/** 未付款提醒的時程：下單後 1 小時、24 小時、72 小時各寄一封，最多三封 */
export const REMIND_AFTER_HOURS = [1, 24, 72];
/** 超過這個天數的訂單不再提醒 */
export const REMIND_MAX_DAYS = 7;

/** 這張訂單現在該寄第幾封（1 起算）；還不到時間或已寄完回傳 0 */
export function dueReminder(o: { createdAt: number; remindCount: number; remindAt: number | null }, now: number): number {
  const next = o.remindCount + 1;
  if (next > REMIND_AFTER_HOURS.length || now - o.createdAt > REMIND_MAX_DAYS * 86400) return 0;
  if (now - o.createdAt < REMIND_AFTER_HOURS[next - 1] * 3600) return 0;
  // 兩封之間至少隔 12 小時（服務停過一陣子再啟動時，不會連續寄）
  if (o.remindAt && now - o.remindAt < 12 * 3600) return 0;
  return next;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

type Order = { orderNo: string; accessKey: string | null; market: string; currency: string; contactName: string; total: number; shippingFee: number };
type Item = { name: string; qty: number; lineTotal: number; previewUrl: string | null; colorName: string | null; sizeName: string | null };

const COPY = {
  zh: {
    subject: [(b: string) => `你在 ${b} 的訂單還沒完成付款`, (b: string) => `你的客製化設計還保留著｜${b}`, (b: string) => `最後提醒：${b} 訂單即將取消保留`],
    hi: (n: string) => `${n} 你好，`,
    lead: ["你的訂單已經成立，但我們還沒收到款項。完成付款後就會開始審稿與製作。", "你設計的商品還在等你。完成付款後我們就會依你確認的設計開始製作。", "這是最後一次提醒。若不需要這張訂單可以直接忽略這封信，我們不會再寄信打擾。"],
    order: "訂單編號", qty: "數量", shipping: "運費", total: "應付總額", cta: "前往付款", help: "付款遇到問題？直接回覆這封信，我們會協助你。",
    stop: "不想再收到這張訂單的提醒", why: "你會收到這封信，是因為你在本站送出了訂單但尚未付款。", free: "免運",
  },
  en: {
    subject: [(b: string) => `Your ${b} order is waiting for payment`, (b: string) => `Your custom design is still saved | ${b}`, (b: string) => `Last reminder: your ${b} order`],
    hi: (n: string) => `Hi ${n},`,
    lead: ["Your order has been placed, but we have not received payment yet. Once you pay, we will review your artwork and start production.", "The items you designed are still waiting for you. Complete payment and we will produce them exactly as you approved.", "This is our last reminder. If you no longer need this order, simply ignore this email and we will not contact you about it again."],
    order: "Order number", qty: "Qty", shipping: "Delivery", total: "Total", cta: "Complete payment", help: "Having trouble paying? Just reply to this email and we will help.",
    stop: "Stop reminders for this order", why: "You are receiving this email because you placed an order on our site that has not been paid.", free: "Free",
  },
};

/** 組出第 n 封提醒信（n = 1..3）的主旨、HTML 與純文字 */
export function recoverMail(o: Order, items: Item[], n: number, origin: string, brand: string) {
  const m = marketOf(o.market), c = m.locale === "en" ? COPY.en : COPY.zh, money = moneyFmtOf(o.currency), i = Math.min(Math.max(n, 1), 3) - 1;
  const key = o.accessKey ? `?key=${o.accessKey}` : "";
  const payUrl = `${origin}${localize(`/orders/${o.orderNo}`, m)}${key}`;
  const stopUrl = `${origin}/api/recover/stop?orderNo=${encodeURIComponent(o.orderNo)}${key.replace("?", "&")}`;
  const img = (u: string | null) => (u ? (u.startsWith("/") ? origin + u : u) : "");
  const name = o.contactName.trim().slice(0, 40);
  const rows = items.map((it) => `<tr>
<td style="padding:10px 12px 10px 0;width:64px">${it.previewUrl ? `<img src="${esc(img(it.previewUrl))}" width="64" height="64" alt="" style="display:block;border-radius:8px;border:1px solid #e7e3da;object-fit:cover">` : ""}</td>
<td style="padding:10px 0;font-size:14px;line-height:1.5"><strong>${esc(it.name)}</strong><br><span style="color:#777">${esc([it.colorName, it.sizeName].filter(Boolean).join(" / "))}${it.colorName || it.sizeName ? " · " : ""}${c.qty} ${it.qty}</span></td>
<td style="padding:10px 0;font-size:14px;text-align:right;white-space:nowrap">${esc(money(it.lineTotal))}</td></tr>`).join("");
  const html = `<!doctype html><html lang="${m.lang}"><body style="margin:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,'Noto Sans TC',sans-serif;color:#1f1e1b">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
<div style="font-size:22px;font-weight:800;letter-spacing:-.03em;text-transform:uppercase">${esc(brand)}</div>
<div style="background:#fff;border-radius:14px;padding:24px;margin-top:16px">
<p style="margin:0 0 12px;font-size:15px">${esc(c.hi(name))}</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.7">${c.lead[i]}</p>
<p style="margin:0 0 6px;font-size:12px;color:#777">${c.order} ${esc(o.orderNo)}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eee">${rows}</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eee;margin-top:4px;font-size:14px">
<tr><td style="padding:10px 0 2px;color:#777">${c.shipping}</td><td style="padding:10px 0 2px;text-align:right">${o.shippingFee > 0 ? esc(money(o.shippingFee)) : c.free}</td></tr>
<tr><td style="padding:4px 0;font-weight:700">${c.total}</td><td style="padding:4px 0;text-align:right;font-size:18px;font-weight:700">${esc(money(o.total))}</td></tr></table>
<p style="margin:22px 0 8px;text-align:center"><a href="${esc(payUrl)}" style="display:inline-block;background:#1f1e1b;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 34px;border-radius:999px">${c.cta}</a></p>
<p style="margin:16px 0 0;font-size:13px;color:#777;line-height:1.6;text-align:center">${c.help}</p>
</div>
<p style="margin:16px 4px 0;font-size:11px;color:#999;line-height:1.7">${c.why}<br><a href="${esc(stopUrl)}" style="color:#999">${c.stop}</a></p>
</div></body></html>`;
  const text = [c.hi(name), "", c.lead[i], "", `${c.order} ${o.orderNo}`, ...items.map((it) => `- ${it.name} × ${it.qty}  ${money(it.lineTotal)}`), `${c.shipping}: ${o.shippingFee > 0 ? money(o.shippingFee) : c.free}`, `${c.total}: ${money(o.total)}`, "", `${c.cta}: ${payUrl}`, "", c.help, "", `${c.stop}: ${stopUrl}`].join("\n");
  return { subject: c.subject[i](brand), html, text, payUrl, stopUrl };
}
