/** Meta 像素／轉換 API 用的純函式（可單獨測試） */
import { createHash } from "node:crypto";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
/** Meta 要求的雜湊前格式：email 小寫去空白；電話只留數字（含國碼、不含開頭的 0 與加號） */
export const normEmail = (email: string) => email.trim().toLowerCase();
export const normPhone = (phone: string) => phone.replace(/\D/g, "").replace(/^0+/, "");

import { purchaseEventId } from "./meta-ids";
export { purchaseEventId };

/** 下單當下記錄的瀏覽器資訊：_fbp、_fbc（廣告點擊）、IP 與瀏覽器字串，之後伺服器送轉換時附上以提高比對率 */
export function metaFromRequest(headers: { get(name: string): string | null }) {
  const jar = new Map((headers.get("cookie") ?? "").split(";").map((x) => { const i = x.indexOf("="); return [x.slice(0, i).trim(), x.slice(i + 1).trim()] as [string, string]; }));
  const clean = (v: string | undefined, re: RegExp) => (v && re.test(v) ? v.slice(0, 300) : null);
  const ip = (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || headers.get("x-real-ip") || "";
  return {
    metaFbp: clean(jar.get("_fbp"), /^fb\.\d\.\d+\.\d+$/),
    metaFbc: clean(jar.get("_fbc"), /^fb\.\d\.\d+\..+$/),
    clientIp: /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null,
    clientUa: (headers.get("user-agent") ?? "").slice(0, 400) || null,
  };
}

type Order = {
  orderNo: string; total: number; currency: string; country: string; contactEmail: string; contactPhone: string; paidAt: number | null; createdAt: number;
  metaFbp: string | null; metaFbc: string | null; clientIp: string | null; clientUa: string | null;
};
type Item = { sku: string; qty: number; unitPrice?: number };

/** 轉換 API 的 Purchase 事件（欄位與瀏覽器端 fbq('track','Purchase') 一致） */
export function metaPurchaseEvent(o: Order, items: Item[], eventSourceUrl: string, now = Math.floor(Date.now() / 1000)) {
  const phone = normPhone(o.contactPhone);
  return {
    event_name: "Purchase",
    // Meta 不接受超過 7 天前或未來的時間
    event_time: Math.min(now, Math.max(o.paidAt ?? o.createdAt, now - 7 * 86400 + 60)),
    event_id: purchaseEventId(o.orderNo),
    action_source: "website",
    event_source_url: eventSourceUrl,
    user_data: {
      em: [sha256(normEmail(o.contactEmail))],
      ...(phone ? { ph: [sha256(phone)] } : {}),
      country: [sha256(o.country.toLowerCase())],
      ...(o.clientIp ? { client_ip_address: o.clientIp } : {}),
      ...(o.clientUa ? { client_user_agent: o.clientUa } : {}),
      ...(o.metaFbp ? { fbp: o.metaFbp } : {}),
      ...(o.metaFbc ? { fbc: o.metaFbc } : {}),
    },
    custom_data: {
      value: o.total, currency: o.currency, order_id: o.orderNo, content_type: "product",
      content_ids: [...new Set(items.map((i) => i.sku))],
      contents: items.map((i) => ({ id: i.sku, quantity: i.qty, ...(i.unitPrice != null ? { item_price: i.unitPrice } : {}) })),
      num_items: items.reduce((a, i) => a + i.qty, 0),
    },
  };
}
