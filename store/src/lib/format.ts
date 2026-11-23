import "server-only";
import { moneyFmt, moneyFmtOf } from "@/config/markets";
import { currentMarket } from "@/market/server";

/** 伺服器端用；瀏覽器端元件請用 @/market/client 的 useMoney() */
export const fmtMoney = (n: number, currency?: string | null) => (currency ? moneyFmtOf(currency) : moneyFmt(currentMarket()))(n);
export const fmtNum = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
export const fmtDate = (unix: number) =>
  new Intl.DateTimeFormat(currentMarket().locale === "en" ? currentMarket().lang : "zh-TW", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei" }).format(new Date(unix * 1000));
