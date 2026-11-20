import { site } from "@/config/site";

const nf = new Intl.NumberFormat(site.locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const fmtMoney = (n: number) => `${site.currencySymbol}${nf.format(n)}`;
export const fmtNum = (n: number) => nf.format(n);
export const fmtDate = (unix: number) =>
  new Intl.DateTimeFormat(site.locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(unix * 1000));
