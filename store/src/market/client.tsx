"use client";
import { createContext, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { localize, marketOf, moneyFmt, type Market, type MarketCode } from "@/config/markets";
import { dictFor } from "@/i18n/dicts";

const Ctx = createContext<MarketCode>("tw");
export function MarketProvider({ code, children }: { code: MarketCode; children: React.ReactNode }) {
  return <Ctx.Provider value={code}>{children}</Ctx.Provider>;
}
export const useMarket = (): Market => marketOf(useContext(Ctx));
export const useT = () => dictFor(useMarket());
export function useMoney() {
  const m = useMarket();
  return useMemo(() => moneyFmt(m), [m]);
}
/** 站內路徑加上市場前綴 */
export function useHref() {
  const m = useMarket();
  return (href: string) => localize(href, m);
}
/** router.push 的市場版 */
export function useNav() {
  const router = useRouter(), m = useMarket();
  return { push: (href: string) => router.push(localize(href, m)), replace: (href: string) => router.replace(localize(href, m)), refresh: () => router.refresh() };
}
