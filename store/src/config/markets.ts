/**
 * 各國市場設定。台灣站在根目錄，其他國家用子目錄（/sg、/my、/au、/ae、/uk），內容為英文。
 * 商品成本與定價以新台幣維護，海外站依匯率換算成當地幣別；匯率與運費可用環境變數覆寫：
 *   NEXT_PUBLIC_FX_SGD=0.0407（1 新台幣換多少當地幣）、NEXT_PUBLIC_SHIP_SG=9.9,80（運費,免運門檻）、NEXT_PUBLIC_PRICE_US=1.5（價格倍率）
 */
export type MarketCode = "tw" | "us" | "sg" | "my" | "au" | "ae" | "uk";
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
  /** 這個市場的價格倍率：台幣定價換匯後再乘上這個數字（美國、英國 1.5，澳洲 1.3，其餘 1） */
  priceFactor: number;
  shipping: { fee: number; freeOver: number; days: string };
  payment: "ecpay" | "stripe";
  /** 電話國碼（結帳表單的預設值） */
  dial: string;
};

const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
function ship(cc: string, fee: number, freeOver: number, days: string) {
  // NEXT_PUBLIC_ 開頭的變數才會進到瀏覽器端，這裡兩種都讀
  const raw = { SG: process.env.NEXT_PUBLIC_SHIP_SG, MY: process.env.NEXT_PUBLIC_SHIP_MY, AU: process.env.NEXT_PUBLIC_SHIP_AU, AE: process.env.NEXT_PUBLIC_SHIP_AE, GB: process.env.NEXT_PUBLIC_SHIP_GB, US: process.env.NEXT_PUBLIC_SHIP_US }[cc];
  const [f, o] = (raw ?? "").split(",").map(Number);
  return { fee: Number.isFinite(f) && raw ? f : fee, freeOver: Number.isFinite(o) ? o : freeOver, days };
}

export const markets: Record<MarketCode, Market> = {
  tw: {
    code: "tw", dial: "+886", prefix: "", locale: "zh-TW", lang: "zh-TW", country: "TW", countryName: "台灣", currency: "TWD", symbol: "NT$", rate: 1, priceFactor: 1, payment: "ecpay",
    shipping: { fee: Number(process.env.NEXT_PUBLIC_SHIP_FEE ?? "160"), freeOver: Number(process.env.NEXT_PUBLIC_SHIP_FREE_OVER ?? "2000"), days: process.env.NEXT_PUBLIC_SHIP_DAYS ?? "3–5" },
  },
  us: { code: "us", dial: "+1", prefix: "/us", locale: "en", lang: "en-US", country: "US", countryName: "United States", currency: "USD", symbol: "$", rate: num(process.env.NEXT_PUBLIC_FX_USD, 0.0313), priceFactor: num(process.env.NEXT_PUBLIC_PRICE_US, 1.5), payment: "stripe", shipping: ship("US", 6.99, 75, "8–14") },
  sg: { code: "sg", dial: "+65", prefix: "/sg", locale: "en", lang: "en-SG", country: "SG", countryName: "Singapore", currency: "SGD", symbol: "S$", rate: num(process.env.NEXT_PUBLIC_FX_SGD, 0.041), priceFactor: num(process.env.NEXT_PUBLIC_PRICE_SG, 1), payment: "stripe", shipping: ship("SG", 9.9, 80, "7–12") },
  my: { code: "my", dial: "+60", prefix: "/my", locale: "en", lang: "en-MY", country: "MY", countryName: "Malaysia", currency: "MYR", symbol: "RM", rate: num(process.env.NEXT_PUBLIC_FX_MYR, 0.133), priceFactor: num(process.env.NEXT_PUBLIC_PRICE_MY, 1), payment: "stripe", shipping: ship("MY", 22, 200, "7–12") },
  au: { code: "au", dial: "+61", prefix: "/au", locale: "en", lang: "en-AU", country: "AU", countryName: "Australia", currency: "AUD", symbol: "A$", rate: num(process.env.NEXT_PUBLIC_FX_AUD, 0.048), priceFactor: num(process.env.NEXT_PUBLIC_PRICE_AU, 1.3), payment: "stripe", shipping: ship("AU", 9.99, 99, "8–14") },
  ae: { code: "ae", dial: "+971", prefix: "/ae", locale: "en", lang: "en-AE", country: "AE", countryName: "United Arab Emirates", currency: "AED", symbol: "AED ", rate: num(process.env.NEXT_PUBLIC_FX_AED, 0.116), priceFactor: num(process.env.NEXT_PUBLIC_PRICE_AE, 1), payment: "stripe", shipping: ship("AE", 32, 300, "8–14") },
  uk: { code: "uk", dial: "+44", prefix: "/uk", locale: "en", lang: "en-GB", country: "GB", countryName: "United Kingdom", currency: "GBP", symbol: "£", rate: num(process.env.NEXT_PUBLIC_FX_GBP, 0.0238), priceFactor: num(process.env.NEXT_PUBLIC_PRICE_GB, 1.5), payment: "stripe", shipping: ship("GB", 4.99, 50, "8–14") },
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

/** 新台幣金額換成當地幣別，並套用該市場的價格倍率（四捨五入到小數兩位） */
export const toLocal = (twd: number, m: Market) => (m.rate === 1 && m.priceFactor === 1 ? twd : Math.round((twd * m.rate * m.priceFactor + Number.EPSILON) * 100) / 100);

export function moneyFmt(m: Pick<Market, "symbol" | "currency">) {
  const nf = new Intl.NumberFormat("en-US", { minimumFractionDigits: m.currency === "TWD" ? 0 : 2, maximumFractionDigits: 2 });
  return (n: number) => `${m.symbol}${nf.format(n)}`;
}
/** 依幣別代碼取得格式（訂單用下單當時的幣別顯示） */
export const moneyFmtOf = (currency: string | null | undefined) => moneyFmt(marketList.find((x) => x.currency === currency) ?? markets.tw);
export const fmtNum = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

/** 結帳時可選的電話國碼：各國站的國碼排前面，其餘是常見國家 */
export const DIAL_CODES: [string, string][] = [
  ["+886", "TW"], ["+1", "US/CA"], ["+65", "SG"], ["+60", "MY"], ["+61", "AU"], ["+971", "AE"], ["+44", "UK"],
  ["+852", "HK"], ["+853", "MO"], ["+86", "CN"], ["+81", "JP"], ["+82", "KR"], ["+66", "TH"], ["+84", "VN"], ["+63", "PH"], ["+62", "ID"], ["+91", "IN"],
  ["+64", "NZ"], ["+966", "SA"], ["+974", "QA"], ["+965", "KW"], ["+973", "BH"], ["+968", "OM"], ["+353", "IE"], ["+33", "FR"], ["+49", "DE"], ["+34", "ES"], ["+39", "IT"], ["+31", "NL"],
];
/** 把「國碼 + 號碼」組成國際格式；號碼開頭的 0 會去掉（0912… → +886 912…） */
export function intlPhone(code: string, number: string): string {
  const digits = number.replace(/[^0-9]/g, "").replace(/^0+/, "");
  return digits ? `${code} ${digits}` : "";
}
/** 國際格式轉回該國的本地寫法（+886 912345678 → 0912345678），給只收本地號碼的系統用 */
export function localPhone(phone: string, dial: string): string {
  const p = phone.replace(/[\s-]/g, "");
  return p.startsWith(dial) ? `0${p.slice(dial.length)}` : p;
}

/**
 * 暫時不顯示商品評價的站台（逗號分隔的站台代碼）。預設隱藏台灣站；
 * 要重新顯示就把環境變數 NEXT_PUBLIC_HIDE_REVIEWS 設成空字串。評價資料本身不會被刪除。
 */
const HIDE_REVIEWS = new Set((process.env.NEXT_PUBLIC_HIDE_REVIEWS ?? "tw").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean));
export const reviewsHidden = (marketCode: string) => HIDE_REVIEWS.has(marketCode.toLowerCase());
