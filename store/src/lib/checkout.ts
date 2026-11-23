import "server-only";
import { getProductsByIds, listZones, type ProductFull } from "./catalog";
import { quoteLine, QuoteError, variantKey, type LineQuote, type PrintSelection } from "./pricing";
import { flatShipping, packItems, quoteAllModes, type Pack, type ShipQuote } from "./shipping";
import { currentMarket } from "@/market/server";
import { t } from "@/i18n";

export type CartLineInput = { id: string; productId: number; qty: number; prints: PrintSelection[]; colorName?: string | null; sizeName?: string | null };

export type PricedLine =
  | { id: string; ok: true; quote: LineQuote; labels: string[]; product: ProductFull }
  | { id: string; ok: false; error: string };

export type PricedCart = {
  lines: PricedLine[];
  pack: Pack;
  zones: { code: string; name: string }[];
  zoneCode: string | null;
  shipping: ShipQuote[];
};

/** 把前端送來的購物車內容清洗成可信的結構 */
export function sanitizeLines(raw: unknown): CartLineInput[] | null {
  if (!Array.isArray(raw) || raw.length > 50) return null;
  const out: CartLineInput[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const x = r as Record<string, unknown>;
    if (typeof x.productId !== "number" || !Array.isArray(x.prints) || x.prints.length > 10) return null;
    out.push({
      id: String(x.id ?? ""),
      productId: x.productId,
      qty: Number(x.qty),
      colorName: typeof x.colorName === "string" ? x.colorName.slice(0, 40) : null,
      sizeName: typeof x.sizeName === "string" ? x.sizeName.slice(0, 40) : null,
      prints: (x.prints as Record<string, unknown>[]).map((p) => ({
        positionCode: String(p?.positionCode ?? ""), areaCode: String(p?.areaCode ?? ""), methodCode: String(p?.methodCode ?? ""), colors: Number(p?.colors ?? 1),
      })),
    });
  }
  return out;
}

export function printLabel(p: ProductFull, s: PrintSelection): string {
  const pos = p.positions.find((x) => x.code === s.positionCode);
  const area = pos?.areas.find((a) => a.code === s.areaCode);
  const method = p.methods.find((m) => m.code === s.methodCode);
  return `${pos?.name ?? s.positionCode}｜${area?.name ?? s.areaCode}｜${method?.name ?? s.methodCode}${method?.perColor ? ` ${s.colors} ${t.product.colorsUnit}` : ""}`;
}

/** 伺服器端重新計價：商品、印刷、版費，以及整張訂單的空運 / 海運運費 */
export async function priceCart(inputs: CartLineInput[], zoneCode: string | null): Promise<PricedCart> {
  const m = currentMarket();
  // 海外站只送到該國，不用運送地區表
  const [products, zones] = await Promise.all([getProductsByIds([...new Set(inputs.map((i) => i.productId))], m), m.code === "tw" ? listZones() : [{ code: m.country, name: m.countryName, rates: [] }]]);
  if (m.code !== "tw") zoneCode = m.country;
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: PricedLine[] = inputs.map((i) => {
    const product = byId.get(i.productId);
    if (!product) return { id: i.id, ok: false, error: t.cart.lineError };
    try {
      const quote = quoteLine(product.pricing, i.qty, i.prints, variantKey(i.colorName, i.sizeName));
      return { id: i.id, ok: true, quote, labels: quote.prints.map((s) => printLabel(product, s)), product };
    } catch (e) {
      return { id: i.id, ok: false, error: e instanceof QuoteError ? t.errors.quote[e.code] ?? e.message : t.cart.lineError };
    }
  });
  const pack = packItems(lines.flatMap((l) => (l.ok ? [{ ...l.product, qty: l.quote.qty }] : [])));
  const zone = zones.find((z) => z.code === zoneCode) ?? null;
  return {
    lines,
    pack,
    zones: zones.map((z) => ({ code: z.code, name: z.name })),
    zoneCode: zone?.code ?? null,
    shipping: zone && lines.some((l) => l.ok)
      ? flatShipping(m.shipping, lines.reduce((a, l) => a + (l.ok ? l.quote.goodsTotal + l.quote.printTotal + l.quote.setupTotal : 0), 0)) ?? quoteAllModes(zone.rates, pack)
      : [],
  };
}
