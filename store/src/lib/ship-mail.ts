import { localize, marketOf } from "@/config/markets";

/** 物流追蹤頁（17TRACK 會自動辨識物流商；HiCustom 的線路不固定，所以用通用查詢頁） */
export function trackingUrl(trackingNo: string, locale: string): string {
  return `https://t.17track.net/${locale === "en" ? "en" : "zh-hant"}#nums=${encodeURIComponent(trackingNo.trim())}`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

type Order = { orderNo: string; accessKey: string | null; market: string; contactName: string; trackingNo: string | null; trackingCarrier: string | null };
type Item = { name: string; qty: number; colorName: string | null; sizeName: string | null };

const COPY = {
  zh: {
    subject: (b: string, no: string) => `你的訂單已出貨｜${b} ${no}`,
    hi: (n: string) => `${n} 你好，`,
    lead: "你的訂單已經出貨了。可以用下面的物流單號查看即時貨態。",
    note: "物流單號剛建立時，貨態通常要 1–2 天才會開始更新。",
    order: "訂單編號", carrier: "物流商", tracking: "物流單號", qty: "數量", cta: "查看即時貨態", view: "查看訂單", help: "有任何問題，直接回覆這封信就可以。",
    why: "你會收到這封信，是因為你在本站的訂單已經出貨。",
  },
  en: {
    subject: (b: string, no: string) => `Your order has shipped | ${b} ${no}`,
    hi: (n: string) => `Hi ${n},`,
    lead: "Your order is on its way. Use the tracking number below to follow your parcel.",
    note: "Tracking updates can take 1–2 days to appear after a label is created.",
    order: "Order number", carrier: "Carrier", tracking: "Tracking number", qty: "Qty", cta: "Track your parcel", view: "View order", help: "Any questions? Just reply to this email.",
    why: "You are receiving this email because your order on our site has shipped.",
  },
};

/** 出貨通知信的主旨、HTML 與純文字 */
export function shipMail(o: Order, items: Item[], origin: string, brand: string) {
  const m = marketOf(o.market), c = m.locale === "en" ? COPY.en : COPY.zh;
  const orderUrl = `${origin}${localize(`/orders/${o.orderNo}`, m)}${o.accessKey ? `?key=${o.accessKey}` : ""}`;
  const no = (o.trackingNo ?? "").trim(), carrier = (o.trackingCarrier ?? "").trim();
  const trackUrl = no ? trackingUrl(no, m.locale) : orderUrl;
  const name = o.contactName.trim().slice(0, 40);
  const facts = [[c.order, o.orderNo], ...(carrier ? [[c.carrier, carrier]] : []), ...(no ? [[c.tracking, no]] : [])];
  const rows = items.map((it) => `<tr><td style="padding:8px 0;font-size:14px;line-height:1.5">${esc(it.name)}<br><span style="color:#777;font-size:13px">${esc([it.colorName, it.sizeName].filter(Boolean).join(" / "))}${it.colorName || it.sizeName ? " · " : ""}${c.qty} ${it.qty}</span></td></tr>`).join("");
  const html = `<!doctype html><html lang="${m.lang}"><body style="margin:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,'Noto Sans TC',sans-serif;color:#1f1e1b">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
<div style="font-size:22px;font-weight:800;letter-spacing:-.03em;text-transform:uppercase">${esc(brand)}</div>
<div style="background:#fff;border-radius:14px;padding:24px;margin-top:16px">
<p style="margin:0 0 12px;font-size:15px">${esc(c.hi(name))}</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.7">${c.lead}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;border-top:1px solid #eee">
${facts.map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;color:#777;white-space:nowrap">${k}</td><td style="padding:8px 0;font-weight:600;word-break:break-all">${esc(v)}</td></tr>`).join("")}</table>
<p style="margin:22px 0 8px;text-align:center"><a href="${esc(trackUrl)}" style="display:inline-block;background:#1f1e1b;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 34px;border-radius:999px">${c.cta}</a></p>
<p style="margin:0 0 18px;font-size:12px;color:#777;line-height:1.6;text-align:center">${c.note}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eee">${rows}</table>
<p style="margin:16px 0 0;font-size:13px;text-align:center"><a href="${esc(orderUrl)}" style="color:#1f1e1b">${c.view}</a></p>
<p style="margin:14px 0 0;font-size:13px;color:#777;line-height:1.6;text-align:center">${c.help}</p>
</div>
<p style="margin:16px 4px 0;font-size:11px;color:#999;line-height:1.7">${c.why}</p>
</div></body></html>`;
  const text = [c.hi(name), "", c.lead, "", ...facts.map(([k, v]) => `${k}: ${v}`), "", `${c.cta}: ${trackUrl}`, c.note, "", ...items.map((it) => `- ${it.name} × ${it.qty}`), "", `${c.view}: ${orderUrl}`, "", c.help].join("\n");
  return { subject: c.subject(brand, o.orderNo), html, text, trackUrl, orderUrl };
}
