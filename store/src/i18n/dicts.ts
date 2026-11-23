import type { Market } from "@/config/markets";
import zhTW, { type Dict } from "./zh-TW";
import en from "./en";

const cacheByMarket = new Map<string, Dict>();
/** 取得某個市場的字典（字典裡的運費、幣別文字會依市場帶入） */
export function dictFor(m: Market): Dict {
  let d = cacheByMarket.get(m.code);
  if (!d) cacheByMarket.set(m.code, (d = m.locale === "en" ? en(m) : zhTW(m)));
  return d;
}
export type { Dict };
