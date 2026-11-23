import { createHash } from "crypto";

/**
 * 綠界 ECPay 全方位金流（AioCheckOut V5）。
 * 金鑰只放在環境變數，不進版本庫：
 *   ECPAY_MERCHANT_ID / ECPAY_HASH_KEY / ECPAY_HASH_IV；ECPAY_STAGE=1 時走測試環境。
 */
export function ecpayConfig() {
  const merchantId = process.env.ECPAY_MERCHANT_ID?.trim(), hashKey = process.env.ECPAY_HASH_KEY?.trim(), hashIv = process.env.ECPAY_HASH_IV?.trim();
  if (!merchantId || !hashKey || !hashIv) return null;
  const stage = process.env.ECPAY_STAGE === "1";
  return { merchantId, hashKey, hashIv, stage, action: `https://payment${stage ? "-stage" : ""}.ecpay.com.tw/Cashier/AioCheckOut/V5` };
}
export const ecpayEnabled = () => !!ecpayConfig();

/** 綠界規定的 URL 編碼（等同 .NET 的 HttpUtility.UrlEncode 再轉小寫） */
function dotNetEncode(s: string) {
  return encodeURIComponent(s).replace(/%20/g, "+").replace(/~/g, "%7e").replace(/'/g, "%27").toLowerCase();
}

/** 檢查碼：參數依名稱排序 → 前後加上 HashKey / HashIV → URL 編碼 → SHA256 → 大寫 */
export function checkMac(params: Record<string, string | number>, hashKey: string, hashIv: string) {
  const keys = Object.keys(params).filter((k) => k !== "CheckMacValue").sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), "en"));
  const raw = `HashKey=${hashKey}&${keys.map((k) => `${k}=${params[k]}`).join("&")}&HashIV=${hashIv}`;
  return createHash("sha256").update(dotNetEncode(raw)).digest("hex").toUpperCase();
}

/** 驗證綠界回傳的檢查碼（固定時間比較） */
export function verifyMac(params: Record<string, string>, hashKey: string, hashIv: string) {
  const got = String(params.CheckMacValue ?? "").toUpperCase(), want = checkMac(params, hashKey, hashIv);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

/** 綠界的交易時間用台北時間 yyyy/MM/dd HH:mm:ss */
export function tradeDate(d = new Date()) {
  const t = new Date(d.getTime() + 8 * 3600_000), p = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}/${p(t.getUTCMonth() + 1)}/${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}`;
}

/**
 * 綠界的交易編號每次付款嘗試都必須不同（最多 20 碼英數）。
 * 用「訂單編號 + 時間尾碼」，回傳時取前面的訂單編號長度即可對回訂單。
 */
export function tradeNo(orderNo: string, now = Date.now()) {
  const base = orderNo.replace(/[^0-9A-Za-z]/g, "").slice(0, 15);
  return (base + Math.floor(now / 1000).toString(36).toUpperCase().slice(-5).padStart(5, "0")).slice(0, 20);
}
export const orderNoOf = (merchantTradeNo: string) => merchantTradeNo.slice(0, -5);

/** 組出要送到綠界的表單欄位 */
export function checkoutFields(cfg: NonNullable<ReturnType<typeof ecpayConfig>>, o: { orderNo: string; total: number; itemName: string; origin: string }) {
  const fields: Record<string, string | number> = {
    MerchantID: cfg.merchantId,
    MerchantTradeNo: tradeNo(o.orderNo),
    MerchantTradeDate: tradeDate(),
    PaymentType: "aio",
    TotalAmount: Math.round(o.total),
    TradeDesc: "Kindmark order",
    ItemName: o.itemName.slice(0, 190),
    ReturnURL: `${o.origin}/api/ecpay/notify`,
    OrderResultURL: `${o.origin}/api/ecpay/return`,
    ClientBackURL: `${o.origin}/orders/${o.orderNo}`,
    ChoosePayment: "ALL",
    EncryptType: 1,
    CustomField1: o.orderNo,
  };
  fields.CheckMacValue = checkMac(fields, cfg.hashKey, cfg.hashIv);
  return fields;
}

/** 對外網址：正式環境用設定的網域，否則取請求的來源 */
export function siteOrigin(req: Request) {
  const env = process.env.SITE_URL?.replace(/\/$/, "") || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "");
  if (env) return env;
  const h = req.headers, host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : new URL(req.url).origin;
}
