import type { Market } from "@/config/markets";
import zhTW, { type Dict } from "./zh-TW";
import en from "./en";

const cacheByMarket = new Map<string, Dict>();
/** 取得某個市場的字典（字典裡的運費、幣別文字會依市場帶入） */
export function dictFor(m: Market): Dict {
  let d = cacheByMarket.get(m.code);
  if (!d) cacheByMarket.set(m.code, (d = m.locale === "en" ? (m.code === "us" ? american(en(m)) : en(m)) : zhTW(m)));
  return d;
}
/** 美國站用美式拼字（colour → color、customise → customize…） */
const US: [RegExp, string][] = [[/([Cc])olour/g, "$1olor"], [/([Cc])ustomis/g, "$1ustomiz"], [/([Pp])ersonalis/g, "$1ersonaliz"], [/([Cc])entre/g, "$1enter"], [/([Cc])atalogue/g, "$1atalog"], [/\bPostcode\b/g, "ZIP code"], [/\bpostcode\b/g, "ZIP code"], [/State \/ Region/g, "State"], [/City \/ Suburb/g, "City"]];
const usText = (s: string) => US.reduce((a, [re, to]) => a.replace(re, to), s);
function american<T>(v: T): T {
  if (typeof v === "string") return usText(v) as T;
  if (typeof v === "function") return ((...args: unknown[]) => american((v as (...a: unknown[]) => unknown)(...args))) as T;
  if (Array.isArray(v)) return v.map(american) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, american(x)])) as T;
  return v;
}
export type { Dict };
