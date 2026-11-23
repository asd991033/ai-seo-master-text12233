import "server-only";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { toLocal, type Market } from "@/config/markets";
import { term, uniqueTerms } from "@/i18n/terms";
import type { ProductPricing, Tier } from "./pricing";

type EnData = { names: Record<string, string>; lines: Record<string, string> };
let en: EnData | null = null;
/** 商品英文名稱與說明（catalog/en.json.gz），第一次用到時載入 */
export function enData(): EnData {
  if (!en) {
    try { en = JSON.parse(gunzipSync(readFileSync(path.join(process.cwd(), "catalog", "en.json.gz"))).toString("utf8")) as EnData; }
    catch { en = { names: {}, lines: {} }; }
  }
  return en;
}
const CJK = /[㐀-鿿]/;
const lineEn = (l: string) => { const k = l.trim(); return k && CJK.test(k) ? enData().lines[k] ?? term(k, "en") : l; };
export const textEn = (s: string | null | undefined) => (s ? s.split("\n").map(lineEn).join("\n") : s ?? "");
export const nameEn = (sku: string, name: string) => enData().names[sku] ?? name;

/** 英文站搜尋：回傳英文品名符合關鍵字的 SKU */
export function searchEn(q: string): string[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return Object.entries(enData().names).filter(([sku, n]) => { const s = `${n} ${sku}`.toLowerCase(); return words.every((w) => s.includes(w)); }).map(([sku]) => sku);
}

const tiersTo = (rows: Tier[], m: Market) => rows.map((r) => ({ ...r, unitPrice: toLocal(r.unitPrice, m) }));

/** 把定價表從新台幣換成市場幣別，款式鍵值（顏色|尺碼）換成該語系的名稱 */
export function pricingFor(p: ProductPricing, m: Market, colors: string[], sizes: string[]): ProductPricing {
  if (m.rate === 1 && m.locale === "zh-TW") return p;
  const cMap = new Map(colors.map((c, i) => [c, uniqueTerms(colors, m.locale)[i]])), sMap = new Map(sizes.map((s, i) => [s, uniqueTerms(sizes, m.locale)[i]]));
  return {
    ...p,
    tiers: tiersTo(p.tiers, m),
    ...(p.variants ? { variants: Object.fromEntries(Object.entries(p.variants).map(([k, rows]) => { const i = k.indexOf("|"), c = k.slice(0, i), s = k.slice(i + 1); return [`${cMap.get(c) ?? c}|${sMap.get(s) ?? s}`, tiersTo(rows, m)]; })) } : {}),
    ...(p.extraFacePrice ? { extraFacePrice: toLocal(p.extraFacePrice, m) } : {}),
    printPrices: p.printPrices.map((r) => ({ ...r, unitPrice: toLocal(r.unitPrice, m), setupFee: toLocal(r.setupFee, m) })),
    methods: p.methods.map((x) => ({ ...x, name: term(x.name, m.locale) })),
  };
}

type Loc = {
  sku: string; name: string; summary?: string | null; description?: string | null; material?: string | null; sizeText?: string | null; categoryName?: string | null;
  colors?: { name: string; hex: string; image?: string; display?: string }[]; sizes?: string[];
};
/** 商品的顯示文字換成市場語系（中文站原樣回傳） */
export function localizeText<T extends Loc>(p: T, m: Market): T {
  if (m.locale !== "en") return p;
  const colorNames = p.colors ? uniqueTerms(p.colors.map((c) => c.name), "en") : [];
  return {
    ...p,
    name: nameEn(p.sku, p.name),
    ...(p.summary !== undefined ? { summary: textEn(p.summary) } : {}),
    ...(p.description !== undefined ? { description: textEn(p.description) } : {}),
    ...(p.material !== undefined ? { material: p.material ? term(p.material, "en") : p.material } : {}),
    ...(p.sizeText !== undefined ? { sizeText: p.sizeText ? textEn(p.sizeText) : p.sizeText } : {}),
    ...(p.categoryName !== undefined ? { categoryName: p.categoryName ? term(p.categoryName, "en") : p.categoryName } : {}),
    ...(p.colors ? { colors: p.colors.map((c, i) => ({ ...c, name: colorNames[i], ...(c.display ? { display: term(c.display, "en") } : {}) })) } : {}),
    ...(p.sizes ? { sizes: uniqueTerms(p.sizes, "en") } : {}),
  };
}

/** 訂單上的英文顏色／尺碼名稱反查回原本的中文名稱（送單給供應商時用） */
export function originalOption(options: string[], shown: string | null | undefined): number {
  if (!shown) return -1;
  const i = options.indexOf(shown);
  return i >= 0 ? i : uniqueTerms(options, "en").indexOf(shown);
}
