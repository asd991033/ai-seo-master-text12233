/** 依訪客 IP 判斷國家，決定第一次進站時要不要帶到該國家的站台（純函式，可單獨測試） */
import ip3country from "ip3country";
import type { MarketCode } from "@/config/markets";

/** 有站台的國家 → 站台代碼。其他國家不跳轉，留在原本開啟的頁面 */
const COUNTRY_MARKET: Record<string, MarketCode> = { TW: "tw", US: "us", SG: "sg", MY: "my", AU: "au", AE: "ae", GB: "uk" };

let ready = false;
/** IP（目前只支援 IPv4）→ 兩碼國碼；查不到回傳 null */
export function countryOfIp(ip: string): string | null {
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip.trim())?.[1];
  if (!v4) return null;
  try {
    if (!ready) { ip3country.init(); ready = true; }
    return ip3country.lookupStr(v4) || null;
  } catch {
    return null;
  }
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|lighthouse|pagespeed|headless|monitor|uptime|curl|wget|python|axios|node-fetch|go-http/i;
/** 只有這些「逛商品」的頁面會跳轉；訂單、結帳、會員、排版和文章內頁不跳（網址跟國家綁在一起，跳了會出錯） */
const REDIRECTABLE = /^\/(?:$|products(?:\/[^/]+)?$|guide$|about$|returns$|blog$)/;

export type GeoInput = { path: string; isRootMarket: boolean; method: string; accept: string; userAgent: string; ip: string; done: boolean };

/**
 * 第一次進站、開的是沒有國家前綴的網址（台灣站），而且 IP 屬於有站台的其他國家時，回傳要跳轉去的站台代碼。
 * 搜尋引擎和各種機器人不跳轉，這樣每個國家站都能被正常收錄。
 */
export function geoTarget(i: GeoInput): MarketCode | null {
  if (i.done || !i.isRootMarket || i.method !== "GET" || !i.accept.includes("text/html")) return null;
  if (!i.userAgent || BOT.test(i.userAgent) || !REDIRECTABLE.test(i.path)) return null;
  const market = COUNTRY_MARKET[countryOfIp(i.ip) ?? ""];
  return market && market !== "tw" ? market : null;
}
