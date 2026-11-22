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
  /** 預設級距（最便宜的款式，用於「NT$ 起」） */
  tiers: Tier[];
  /** 依「顏色|尺碼」區分的級距；沒有價差的商品不會有 */
  variants?: Record<string, Tier[]>;
  /** 每多印一面的加價（第一面已含） */
  extraFacePrice?: number;
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
  /** 加印的面數（超過第一面的部分）與每面每件加價 */
  extraFaces: number;
  extraFaceUnit: number;
  extraFaceTotal: number;
  /** 印刷費合計（含加印面） */
  printTotal: number;
  setupTotal: number;
  total: number;
  /** 含印刷與版費攤提後的每件均價 */
  unitAllIn: number;
};

export class QuoteError extends Error {
  constructor(
    public code: "BELOW_MOQ" | "BAD_VARIANT" | "NO_TIER" | "NO_PRINT_PRICE" | "BAD_COLORS" | "DUP_POSITION" | "BAD_QTY",
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

export const variantKey = (color?: string | null, size?: string | null) => `${color ?? ""}|${size ?? ""}`;

/** 取得某個款式（顏色＋尺碼）適用的級距 */
export function tiersFor(p: ProductPricing, variant?: string | null): Tier[] {
  return (variant && p.variants?.[variant]) || p.tiers;
}

export function quoteLine(p: ProductPricing, qty: number, selections: PrintSelection[], variant?: string | null): LineQuote {
  if (!Number.isInteger(qty) || qty <= 0) throw new QuoteError("BAD_QTY", "數量必須為正整數");
  if (qty < p.moq) throw new QuoteError("BELOW_MOQ", `最低訂購量為 ${p.moq}`);
  // 有款式價差的商品必須指定存在的「顏色＋尺碼」，不能用不存在的組合套到最低價
  if (variant != null && p.variants && !p.variants[variant]) throw new QuoteError("BAD_VARIANT", "請選擇顏色與尺碼");
  const tier = pickTier(tiersFor(p, variant), qty);
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
  const extraFaces = p.extraFacePrice ? Math.max(0, prints.length - 1) : 0;
  const extraFaceUnit = extraFaces ? p.extraFacePrice! : 0;
  const extraFaceTotal = money(extraFaces * extraFaceUnit * qty);
  const printTotal = money(prints.reduce((a, x) => a + x.total, 0) + extraFaceTotal);
  const setupTotal = money(prints.reduce((a, x) => a + x.setupFee, 0));
  const total = money(goodsTotal + printTotal + setupTotal);
  return {
    qty,
    baseUnitPrice: tier.unitPrice,
    goodsTotal,
    prints,
    extraFaces,
    extraFaceUnit,
    extraFaceTotal,
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

export const DEFAULT_MARGIN = 0.6;

/**
 * 由成本價與毛利率換算售價：售價 = 成本 ÷ (1 − 毛利率)，無條件進位到整數，
 * 確保實際毛利率不低於設定值。例：成本 100、毛利率 60% → 售價 250。
 */
export function priceFromCost(cost: number, marginRate: number, fx = 1): number {
  cost = cost * fx;
  if (!(marginRate >= 0 && marginRate < 1)) throw new Error("毛利率需介於 0 與 1 之間");
  return Math.ceil(cost / (1 - marginRate) - 1e-9);
}
