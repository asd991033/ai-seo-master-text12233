import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { gunzipSync } from "zlib";
import { readStored } from "./storage";

/**
 * 供應商 HiCustom 開放平台 API（https://api.hicustom.com）。
 * 憑證放在環境變數：HICUSTOM_APP_KEY / HICUSTOM_APP_SECRET / HICUSTOM_STORE_ID。
 * 流程：上傳印刷圖 → 自動合成定製產品 → 建立訂單（建立後需到 HiCustom 後台付款才會生產）→ 查詢狀態與物流單號。
 */
const BASE = "https://api.hicustom.com";

export function hicustomConfig() {
  const appKey = process.env.HICUSTOM_APP_KEY?.trim(), appSecret = process.env.HICUSTOM_APP_SECRET?.trim(), storeId = Number(process.env.HICUSTOM_STORE_ID);
  return appKey && appSecret ? { appKey, appSecret, storeId: Number.isFinite(storeId) && storeId > 0 ? storeId : null } : null;
}
export const hicustomEnabled = () => !!hicustomConfig();

export class HicustomError extends Error {
  constructor(message: string, public code?: number) { super(message); }
}

let token: { value: string; expires: number } | null = null;
async function accessToken(): Promise<string> {
  const cfg = hicustomConfig();
  if (!cfg) throw new HicustomError("尚未設定 HiCustom 憑證");
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const r = await fetch(`${BASE}/oauth/token?app_key=${encodeURIComponent(cfg.appKey)}&app_secret=${encodeURIComponent(cfg.appSecret)}`, { cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!j || j.code !== 200) throw new HicustomError(`HiCustom 授權失敗：${j?.msg ?? r.status}`, j?.code);
  token = { value: j.data.access_token, expires: Date.now() + (Number(j.data.expires_in) || 7200) * 1000 };
  return token.value;
}

async function call<T>(method: "GET" | "POST", pathname: string, opts: { query?: Record<string, string | number>; form?: Record<string, string>; multipart?: FormData } = {}): Promise<T> {
  const q = new URLSearchParams({ access_token: await accessToken() });
  for (const [k, v] of Object.entries(opts.query ?? {})) q.set(k, String(v));
  const init: RequestInit = { method, cache: "no-store" };
  if (opts.multipart) init.body = opts.multipart;
  else if (opts.form) { init.body = new URLSearchParams(opts.form); init.headers = { "Content-Type": "application/x-www-form-urlencoded" }; }
  const r = await fetch(`${BASE}${pathname}?${q}`, init);
  const text = await r.text();
  let j: { code?: number; msg?: string; data?: T } | null = null;
  try { j = JSON.parse(text); } catch { /* 非 JSON 代表路徑或服務異常 */ }
  if (!j) throw new HicustomError(`HiCustom 回應異常（${r.status}）`);
  if (j.code !== 200) throw new HicustomError(j.msg || `HiCustom 錯誤 ${j.code}`, j.code);
  return j.data as T;
}

export type ProductTypeInfo = {
  id: number; cn_name: string;
  colors: { id: number; name: string; tone1: string }[];
  sizes: { id: number; name: string }[];
  stock_info: { id: number; color_id: number; size_id: number }[];
  product_description?: { print_areas?: { id: number; name: string; width: number; height: number }[] };
};
export const productTypeInfo = (id: number) => call<ProductTypeInfo>("GET", `/api/v1/product-type/${id}`);

/** 上傳一張印刷圖到圖庫，回傳圖片編碼 */
export async function uploadGallery(data: Buffer, filename: string, externalId: string) {
  const fd = new FormData();
  fd.set("image", new Blob([new Uint8Array(data)], { type: "image/png" }), filename);
  fd.set("external_id", externalId.slice(0, 60));
  fd.set("cn_name", externalId.slice(0, 60));
  return (await call<{ code: string }>("POST", "/api/v1/gallery", { multipart: fd })).code;
}

export type SynthCfg = { view_id: number; gallery_code: string; width: number; height: number; top_x: number; top_y: number };
/** 自動合成定製產品，回傳定製產品編碼 */
export async function synthesizeProduct(productTypeId: number, colorId: number | null, cfgs: SynthCfg[], externalId: string) {
  const form: Record<string, string> = { product_type_id: String(productTypeId), external_id: externalId.slice(0, 60), cfgs: JSON.stringify(cfgs.map((c) => ({ ...c, view_id: String(c.view_id), width: String(c.width), height: String(c.height), top_x: String(c.top_x), top_y: String(c.top_y) }))) };
  if (colorId) form.default_color_id = String(colorId);
  if (cfgs[0]) form.default_view_id = String(cfgs[0].view_id);
  return (await call<{ code: string }>("POST", "/api/v1/product", { form })).code;
}

export type HcOrder = {
  order_id: string; out_order_id: string; status: number; error_msg?: string; platform_grand_total?: string; platform_subtotal?: string; platform_shipping_amount?: string;
  logistic_info?: { shipping_track_number?: string; logistics_company_name?: string; channel_tracking_number?: string; shipping_time?: string };
};
export const createOrder = (order: Record<string, unknown>) => call<HcOrder>("POST", "/api/v1/order", { form: { order: JSON.stringify(order) } });
export const getOrder = (orderId: string) => call<HcOrder>("GET", `/api/v1/order/${encodeURIComponent(orderId)}`);

/** HiCustom 訂單狀態的中文說明 */
export const HC_STATUS: Record<number, string> = { [-2]: "待編輯（資料不完整）", [-1]: "未付貨款", 3: "已付貨款", 5: "排單中", 8: "確認生產", 9: "已發貨", 7: "已取消" };

export { parseTwAddress } from "./tw-address";

/** 供應商排版資料（catalog/hc-design）：顏色與印刷面的 ID */
export async function hcDesignOf(sku: string): Promise<{ views: { id: number; name: string; pa: { pxW: number; pxH: number } }[]; colors: { id: number; name: string; hex: string }[] } | null> {
  try {
    const code = sku.toUpperCase().replace(/^HC-/, "");
    return JSON.parse(gunzipSync(await fs.readFile(path.join(process.cwd(), "catalog", "hc-design", `${code}.json.gz`))).toString("utf8"));
  } catch { return null; }
}

/** 讀取本站儲存的檔案（/files/...） */
export async function readSiteFile(url: string): Promise<Buffer | null> {
  const m = /^\/files\/(.+)$/.exec(url);
  if (!m) return null;
  const hit = await readStored(m[1].split("/").map(decodeURIComponent));
  return hit?.data ?? null;
}
