import "server-only";
import { cache } from "react";
import { AsyncLocalStorage } from "node:async_hooks";
import { headers } from "next/headers";
import { marketOf, markets, type Market } from "@/config/markets";

/** 頁面算繪期間的市場（每個請求一份）；API 路由用 AsyncLocalStorage */
const holder = cache(() => ({ m: markets.tw as Market, path: "/" }));
const als = new AsyncLocalStorage<Market>();

/** 版面、頁面與 generateMetadata 一開始呼叫，之後同一個請求內的 t、fmtMoney 都會用這個市場 */
export async function initMarket(): Promise<Market> {
  const h = await headers();
  const s = holder();
  s.m = marketOf(h.get("x-market"));
  s.path = h.get("x-path") ?? "/";
  return s.m;
}
export const currentMarket = (): Market => als.getStore() ?? holder().m;
export const currentPath = () => holder().path;

/** API 路由：依 x-market 標頭（middleware 設定）或指定的市場執行 */
export function withMarket<T>(req: Request | string | null | undefined, fn: (m: Market) => T): T {
  const m = marketOf(typeof req === "string" || req == null ? req : req.headers.get("x-market"));
  return als.run(m, () => fn(m));
}
