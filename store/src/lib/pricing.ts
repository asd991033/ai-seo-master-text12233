/**
 * 報價引擎（純函式，前後端共用；下單時伺服器會重算，不信任前端金額）。
 *
 * 單筆商品報價 = 素面單價(依數量級距) × 數量
 *              + Σ 每個印刷位置：印刷單價(依 面積×方式×數量級距) × 色數倍率 × 數量
 *              + Σ 每個印刷位置：版費 × 色數倍率
 */
export type Tier = { minQty: number; unitPrice: number };

export type PrintPriceRow = {
  positionCode: string;
  areaCode: string;
  methodCode: string;
  minQty: number;
  unitPrice: number;
  setupFee: number;
};

export type MethodInfo = { code: string; name: string; perColor: boolean; maxColors: number };

export type PrintSelection = {
  positionCode: string;
  areaCode: string;
  methodCode: string;
  colors: number;
};

export type ProductPricing = {
  moq: number;
  tiers: Tier[];
  printPrices: PrintPriceRow[];
  methods: MethodInfo[];
};

export type PrintLine = PrintSelection & {
  unitPrice: number; // 已含色數倍率的每件印刷費
  setupFee: number; // 已含色數倍率的版費
  total: number; // unitPrice × qty（不含版費）
};

export type LineQuote = {
  qty: number;
  baseUnitPrice: number;
  goodsTotal: number;
  prints: PrintLine[];
  printTotal: number;
  setupTotal: number;
  total: number;
  /** 含印刷與版費攤提後的每件均價 */
  unitAllIn: number;
};

export class QuoteError extends Error {
  constructor(
    public code: "BELOW_MOQ" | "NO_TIER" | "NO_PRINT_PRICE" | "BAD_COLORS" | "DUP_POSITION" | "BAD_QTY",
    message: string,
  ) {
    super(message);
  }
}

export const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** 取得數量適用的級距：minQty 不超過 qty 的最大一級 */
export function pickTier<T extends { minQty: number }>(rows: T[], qty: number): T | null {
  let best: T | null = null;
  for (const r of rows) {
    if (r.minQty <= qty && (!best || r.minQty > best.minQty)) best = r;
  }
  return best;
}

export function quoteLine(p: ProductPricing, qty: number, selections: PrintSelection[]): LineQuote {
  if (!Number.isInteger(qty) || qty <= 0) throw new QuoteError("BAD_QTY", "數量必須為正整數");
  if (qty < p.moq) throw new QuoteError("BELOW_MOQ", `最低訂購量為 ${p.moq}`);
  const tier = pickTier(p.tiers, qty);
  if (!tier) throw new QuoteError("NO_TIER", "此數量沒有對應的價格級距");

  const seen = new Set<string>();
  const prints: PrintLine[] = selections.map((s) => {
    if (seen.has(s.positionCode)) throw new QuoteError("DUP_POSITION", "同一印刷位置只能選一種面積");
    seen.add(s.positionCode);
    const method = p.methods.find((m) => m.code === s.methodCode);
    const rows = p.printPrices.filter(
      (r) => r.positionCode === s.positionCode && r.areaCode === s.areaCode && r.methodCode === s.methodCode,
    );
    const row = pickTier(rows, qty);
    if (!method || !row) throw new QuoteError("NO_PRINT_PRICE", "此印刷組合於該數量沒有報價");
    const colors = method.perColor ? s.colors : 1;
    if (!Number.isInteger(colors) || colors < 1 || colors > Math.max(1, method.maxColors)) {
      throw new QuoteError("BAD_COLORS", `色數需介於 1 ~ ${method.maxColors}`);
    }
    const unitPrice = money(row.unitPrice * colors);
    return { ...s, colors, unitPrice, setupFee: money(row.setupFee * colors), total: money(unitPrice * qty) };
  });

  const goodsTotal = money(tier.unitPrice * qty);
  const printTotal = money(prints.reduce((a, x) => a + x.total, 0));
  const setupTotal = money(prints.reduce((a, x) => a + x.setupFee, 0));
  const total = money(goodsTotal + printTotal + setupTotal);
  return {
    qty,
    baseUnitPrice: tier.unitPrice,
    goodsTotal,
    prints,
    printTotal,
    setupTotal,
    total,
    unitAllIn: money(total / qty),
  };
}

/** 產品列表顯示用的區間價：最低～最高素面單價 */
export function priceRange(tiers: Tier[]): { min: number; max: number } | null {
  if (!tiers.length) return null;
  const v = tiers.map((t) => t.unitPrice);
  return { min: Math.min(...v), max: Math.max(...v) };
}

export type Totals = { goodsTotal: number; printTotal: number; setupTotal: number; shippingFee: number; tax: number; total: number };

export function computeTotals(lines: LineQuote[], shippingFee: number, taxRate: number): Totals {
  const goodsTotal = money(lines.reduce((a, l) => a + l.goodsTotal, 0));
  const printTotal = money(lines.reduce((a, l) => a + l.printTotal, 0));
  const setupTotal = money(lines.reduce((a, l) => a + l.setupTotal, 0));
  const tax = money((goodsTotal + printTotal + setupTotal + shippingFee) * taxRate);
  return { goodsTotal, printTotal, setupTotal, shippingFee, tax, total: money(goodsTotal + printTotal + setupTotal + shippingFee + tax) };
}
