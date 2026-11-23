import type { Locale } from "@/config/markets";
import dict from "./terms-en.json";

const en = dict as Record<string, string>;
/** 片段替換：印刷面積這類「滿版 28 × 30 cm」的組合字 */
const PARTS: [RegExp, string][] = [[/上蓋/g, "Lid "], [/滿版/g, "Full"], [/左胸/g, "Left chest"], [/整面/g, "Full area"], [/^小(?=\s)/, "Small"], [/^中(?=\s)/, "Medium"], [/^大(?=\s)/, "Large"]];
const CJK = /[㐀-鿿]/;

/** 商品選項用語（顏色、尺碼、印刷位置、材質、分類…）翻成指定語系；查不到就原樣回傳 */
export function term(s: string | null | undefined, locale: Locale): string {
  if (!s || locale !== "en") return s ?? "";
  const key = s.trim();
  if (en[key]) return en[key];
  if (!CJK.test(key)) return s;
  // 「滌綸(Polyester)」這類已附英文的寫法，直接取括號裡的英文
  const paren = /^[\u3400-\u9fff\s]+[（(]([A-Za-z][^）)\u3400-\u9fff]*)[）)]$/.exec(key);
  if (paren) return paren[1].charAt(0).toUpperCase() + paren[1].slice(1);
  let out = key;
  for (const [re, to] of PARTS) out = out.replace(re, to);
  return out.replace(/\s+/g, " ").trim();
}

/** 一組名稱翻譯後若有重複（兩個中文顏色翻成同一個英文），在後面加編號，確保可以反查 */
export function uniqueTerms(names: string[], locale: Locale): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const v = term(n, locale), k = seen.get(v) ?? 0;
    seen.set(v, k + 1);
    return k ? `${v} ${k + 1}` : v;
  });
}
