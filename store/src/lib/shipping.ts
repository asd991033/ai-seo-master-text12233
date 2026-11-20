/**
 * 運費引擎（純函式，前後端共用）。
 *
 * 空運：計費重 = max(實重, 材積重)，材積重 = 體積(cm³) / 6000，進位到 0.5 kg
 *       運費 = max(最低收費, 基本費 + 計費重 × 該級距每公斤單價)
 * 海運：計費體積 = max(體積 CBM, 重量噸)，進位到 0.01 CBM
 *       運費 = max(最低收費, 基本費 + 計費體積 × 該級距每 CBM 單價)
 */
import { money, pickTier } from "./pricing";

export type ShipMode = "air" | "sea";
export const AIR_VOLUMETRIC_DIVISOR = 6000;

export type ShipItem = {
  qty: number;
  unitWeightG: number;
  cartonQty: number;
  cartonLengthCm: number;
  cartonWidthCm: number;
  cartonHeightCm: number;
  cartonWeightKg: number;
};

export type Pack = { weightKg: number; cbm: number; cartons: number };

export type RateRow = {
  mode: ShipMode;
  minUnits: number;
  rate: number;
  baseFee: number;
  minCharge: number;
  daysMin: number;
  daysMax: number;
};

export type ShipQuote = {
  mode: ShipMode;
  fee: number;
  /** 空運為計費重(kg)，海運為計費體積(CBM) */
  chargeable: number;
  unit: "kg" | "cbm";
  daysMin: number;
  daysMax: number;
};

/** 依產品重量與裝箱資料估算整批貨的毛重與體積 */
export function packItems(items: ShipItem[]): Pack {
  let weightKg = 0;
  let cbm = 0;
  let cartons = 0;
  for (const it of items) {
    const net = (it.qty * it.unitWeightG) / 1000;
    const hasCarton = it.cartonQty > 0 && it.cartonLengthCm > 0 && it.cartonWidthCm > 0 && it.cartonHeightCm > 0;
    if (hasCarton) {
      const n = Math.ceil(it.qty / it.cartonQty);
      cartons += n;
      cbm += (n * it.cartonLengthCm * it.cartonWidthCm * it.cartonHeightCm) / 1_000_000;
      // 有整箱毛重就按比例算，否則以淨重加 10% 包材
      const gross = it.cartonWeightKg > 0 ? (it.qty / it.cartonQty) * it.cartonWeightKg : net * 1.1;
      weightKg += Math.max(gross, net);
    } else {
      weightKg += net * 1.1;
    }
  }
  return { weightKg: Math.round(weightKg * 100) / 100, cbm: Math.round(cbm * 10000) / 10000, cartons };
}

const ceilTo = (n: number, step: number) => Math.ceil(n / step - 1e-9) * step;

export function quoteShipping(rates: RateRow[], mode: ShipMode, pack: Pack): ShipQuote | null {
  const rows = rates.filter((r) => r.mode === mode);
  if (!rows.length) return null;
  let chargeable: number;
  if (mode === "air") {
    const volumetric = (pack.cbm * 1_000_000) / AIR_VOLUMETRIC_DIVISOR;
    chargeable = Math.max(0.5, ceilTo(Math.max(pack.weightKg, volumetric), 0.5));
  } else {
    chargeable = Math.max(0.01, Math.round(ceilTo(Math.max(pack.cbm, pack.weightKg / 1000), 0.01) * 100) / 100);
  }
  // 低於最小級距時套用最小級距
  const row =
    pickTier(rows.map((r) => ({ minQty: r.minUnits, r })), chargeable)?.r ??
    rows.reduce((a, b) => (a.minUnits <= b.minUnits ? a : b));
  const fee = money(Math.max(row.minCharge, row.baseFee + chargeable * row.rate));
  return { mode, fee, chargeable, unit: mode === "air" ? "kg" : "cbm", daysMin: row.daysMin, daysMax: row.daysMax };
}

export function quoteAllModes(rates: RateRow[], pack: Pack): ShipQuote[] {
  return (["air", "sea"] as const).map((m) => quoteShipping(rates, m, pack)).filter((x): x is ShipQuote => !!x);
}
