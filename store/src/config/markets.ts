/**
 * 各國市場設定。台灣站在根目錄，其他國家用子目錄（/sg、/my、/au、/ae、/uk），內容為英文。
 * 商品成本與定價以新台幣維護，海外站依匯率換算成當地幣別；匯率與運費可用環境變數覆寫：
 *   FX_SGD=0.0407（1 新台幣換多少當地幣）、SHIP_SG=15,150（運費,免運門檻）
 */
export type MarketCode = "tw" | "sg" | "my" | "au" | "ae" | "uk";
export type Locale = "zh-TW" | "en";
export type Market = {
  code: MarketCode;
  /** 網址前綴，台灣是空字串 */
  prefix: string;
  locale: Locale;
  /** <html lang> 與 hreflang */
  lang: string;
  /** ISO 國碼 */
  country: string;
  countryName: string;
  currency: string;
  symbol: string;
  /** 1 新台幣換多少當地幣 */
  rate: number;
  shipping: { fee: number; freeOver: number; days: string };
  payment: "ecpay" | "stripe";
};

const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
function ship(cc: string, fee: number, freeOver: number, days: string) {
  // NEXT_PUBLIC_ 開頭的變數才會進到瀏覽器端，這裡兩種都讀
  const raw = { SG: process.env.NEXT_PUBLIC_SHIP_SG, MY: process.env.NEXT_PUBLIC_SHIP_MY, AU: process.env.NEXT_PUBLIC_SHIP_AU, AE: process.env.NEXT_PUBLIC_SHIP_AE, GB: process.env.NEXT_PUBLIC_SHIP_GB }[cc];
  const [f, o] = (raw ?? "").split(",").map(Number);
  return { fee: Number.isFinite(f) && raw ? f : fee, freeOver: Number.isFinite(o) ? o : freeOver, days };
}

export const markets: Record<MarketCode, Market> = {
  tw: {
    code: "tw", prefix: "", locale: "zh-TW", lang: "zh-TW", country: "TW", countryName: "台灣", currency: "TWD", symbol: "NT$", rate: 1, payment: "ecpay",
    shipping: { fee: Number(process.env.NEXT_PUBLIC_SHIP_FEE ?? "160"), freeOver: Number(process.env.NEXT_PUBLIC_SHIP_FREE_OVER ?? "2000"), days: process.env.NEXT_PUBLIC_SHIP_DAYS ?? "3–5" },
  },
  sg: { code: "sg", prefix: "/sg", locale: "en", lang: "en-SG", country: "SG", countryName: "Singapore", currency: "SGD", symbol: "S$", rate: num(process.env.NEXT_PUBLIC_FX_SGD, 0.041), payment: "stripe", shipping: ship("SG", 15, 150, "7–12") },
  my: { code: "my", prefix: "/my", locale: "en", lang: "en-MY", country: "MY", countryName: "Malaysia", currency: "MYR", symbol: "RM", rate: num(process.env.NEXT_PUBLIC_FX_MYR, 0.133), payment: "stripe", shipping: ship("MY", 39, 400, "7–12") },
  au: { code: "au", prefix: "/au", locale: "en", lang: "en-AU", country: "AU", countryName: "Australia", currency: "AUD", symbol: "A$", rate: num(process.env.NEXT_PUBLIC_FX_AUD, 0.048), payment: "stripe", shipping: ship("AU", 20, 200, "8–14") },
  ae: { code: "ae", prefix: "/ae", locale: "en", lang: "en-AE", country: "AE", countryName: "United Arab Emirates", currency: "AED", symbol: "AED ", rate: num(process.env.NEXT_PUBLIC_FX_AED, 0.116), payment: "stripe", shipping: ship("AE", 55, 550, "8–14") },
  uk: { code: "uk", prefix: "/uk", locale: "en", lang: "en-GB", country: "GB", countryName: "United Kingdom", currency: "GBP", symbol: "£", rate: num(process.env.NEXT_PUBLIC_FX_GBP, 0.0238), payment: "stripe", shipping: ship("GB", 12, 120, "8–14") },
};
export const marketList = Object.values(markets);
export const marketOf = (code: string | null | undefined): Market => markets[(code ?? "tw") as MarketCode] ?? markets.tw;

/** 從網址路徑判斷市場，並回傳去掉前綴後的路徑 */
export function splitPath(pathname: string): { market: Market; path: string } {
  const m = /^\/([a-z]{2})(?=\/|$)/.exec(pathname);
  const market = m && m[1] !== "tw" ? markets[m[1] as MarketCode] : undefined;
  return market ? { market, path: pathname.slice(3) || "/" } : { market: markets.tw, path: pathname };
}

/** 這些路徑不分市場（後台、API、檔案） */
const GLOBAL = /^\/(admin|api|files|_next|d\/|samples|eg|draco)(\/|$)/;
/** 把站內路徑加上市場前綴 */
export function localize(href: string, m: Market): string {
  if (!m.prefix || !href.startsWith("/") || href.startsWith("//") || GLOBAL.test(href)) return href;
  if (splitPath(href).market.code !== "tw") return href;
  return href === "/" ? m.prefix : `${m.prefix}${href}`;
}

/** 新台幣金額換成當地幣別（四捨五入到小數兩位） */
export const toLocal = (twd: number, m: Market) => (m.rate === 1 ? twd : Math.round((twd * m.rate + Number.EPSILON) * 100) / 100);

export function moneyFmt(m: Pick<Market, "symbol" | "currency">) {
  const nf = new Intl.NumberFormat("en-US", { minimumFractionDigits: m.currency === "TWD" ? 0 : 2, maximumFractionDigits: 2 });
  return (n: number) => `${m.symbol}${nf.format(n)}`;
}
/** 依幣別代碼取得格式（訂單用下單當時的幣別顯示） */
export const moneyFmtOf = (currency: string | null | undefined) => moneyFmt(marketList.find((x) => x.currency === currency) ?? markets.tw);
export const fmtNum = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
