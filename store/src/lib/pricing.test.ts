import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteLine, pickTier, priceRange, QuoteError, type ProductPricing } from "./pricing";
import { packItems, quoteShipping, type RateRow } from "./shipping";

const p: ProductPricing = {
  moq: 50,
  tiers: [
    { minQty: 50, unitPrice: 85 },
    { minQty: 100, unitPrice: 72 },
    { minQty: 500, unitPrice: 58 },
  ],
  methods: [
    { code: "screen", name: "網版", perColor: true, maxColors: 4 },
    { code: "dtf", name: "數位", perColor: false, maxColors: 1 },
  ],
  printPrices: [
    { positionCode: "front", areaCode: "s", methodCode: "screen", minQty: 50, unitPrice: 8, setupFee: 600 },
    { positionCode: "front", areaCode: "s", methodCode: "screen", minQty: 300, unitPrice: 5, setupFee: 600 },
    { positionCode: "front", areaCode: "l", methodCode: "screen", minQty: 50, unitPrice: 14, setupFee: 900 },
    { positionCode: "back", areaCode: "s", methodCode: "dtf", minQty: 50, unitPrice: 20, setupFee: 0 },
  ],
};

test("pickTier picks the highest tier not above qty", () => {
  assert.equal(pickTier(p.tiers, 99)?.unitPrice, 85);
  assert.equal(pickTier(p.tiers, 100)?.unitPrice, 72);
  assert.equal(pickTier(p.tiers, 9999)?.unitPrice, 58);
  assert.equal(pickTier(p.tiers, 10), null);
});

test("blank goods quote", () => {
  const q = quoteLine(p, 100, []);
  assert.equal(q.total, 7200);
  assert.equal(q.unitAllIn, 72);
});

test("per-colour method multiplies unit price and setup fee", () => {
  const q = quoteLine(p, 300, [{ positionCode: "front", areaCode: "s", methodCode: "screen", colors: 2 }]);
  assert.equal(q.goodsTotal, 300 * 72);
  assert.equal(q.printTotal, 300 * 5 * 2);
  assert.equal(q.setupTotal, 1200);
  assert.equal(q.total, 21600 + 3000 + 1200);
});

test("different area gives a different price; flat method ignores colours", () => {
  const q = quoteLine(p, 50, [
    { positionCode: "front", areaCode: "l", methodCode: "screen", colors: 1 },
    { positionCode: "back", areaCode: "s", methodCode: "dtf", colors: 9 },
  ]);
  assert.equal(q.printTotal, 50 * 14 + 50 * 20);
  assert.equal(q.setupTotal, 900);
});

test("rejects bad input", () => {
  const code = (fn: () => unknown) => {
    try { fn(); } catch (e) { return (e as QuoteError).code; }
    return null;
  };
  assert.equal(code(() => quoteLine(p, 10, [])), "BELOW_MOQ");
  assert.equal(code(() => quoteLine(p, 1.5, [])), "BAD_QTY");
  assert.equal(code(() => quoteLine(p, 100, [{ positionCode: "front", areaCode: "s", methodCode: "screen", colors: 5 }])), "BAD_COLORS");
  assert.equal(code(() => quoteLine(p, 100, [{ positionCode: "back", areaCode: "l", methodCode: "dtf", colors: 1 }])), "NO_PRINT_PRICE");
  assert.equal(
    code(() =>
      quoteLine(p, 100, [
        { positionCode: "front", areaCode: "s", methodCode: "screen", colors: 1 },
        { positionCode: "front", areaCode: "l", methodCode: "screen", colors: 1 },
      ]),
    ),
    "DUP_POSITION",
  );
});

test("priceRange", () => {
  assert.deepEqual(priceRange(p.tiers), { min: 58, max: 85 });
});

const rates: RateRow[] = [
  { mode: "air", minUnits: 0, rate: 180, baseFee: 300, minCharge: 800, daysMin: 3, daysMax: 5 },
  { mode: "air", minUnits: 45, rate: 150, baseFee: 300, minCharge: 800, daysMin: 3, daysMax: 5 },
  { mode: "sea", minUnits: 0, rate: 4500, baseFee: 1500, minCharge: 3000, daysMin: 10, daysMax: 18 },
];
const item = { unitWeightG: 120, cartonQty: 100, cartonLengthCm: 50, cartonWidthCm: 40, cartonHeightCm: 30, cartonWeightKg: 13 };

test("packing: cartons, weight and volume", () => {
  const pack = packItems([{ ...item, qty: 250 }]);
  assert.equal(pack.cartons, 3);
  assert.equal(pack.cbm, 0.18);
  assert.equal(pack.weightKg, 32.5);
});

test("air uses the greater of actual and volumetric weight", () => {
  // 3 箱 × 60000 cm³ / 6000 = 30 kg 材積重 < 32.5 kg 實重
  const q = quoteShipping(rates, "air", packItems([{ ...item, qty: 250 }]))!;
  assert.equal(q.chargeable, 32.5);
  assert.equal(q.fee, 300 + 32.5 * 180);
  // 輕拋貨：材積重勝出，且跨入 45kg 級距
  const light = quoteShipping(rates, "air", { weightKg: 10, cbm: 0.3, cartons: 5 })!;
  assert.equal(light.chargeable, 50);
  assert.equal(light.fee, 300 + 50 * 150);
});

test("sea charges by CBM with a minimum charge; no carton data falls back to unit weight", () => {
  const q = quoteShipping(rates, "sea", packItems([{ ...item, qty: 250 }]))!;
  assert.equal(q.chargeable, 0.18);
  assert.equal(q.fee, 3000);
  const big = quoteShipping(rates, "sea", { weightKg: 400, cbm: 2, cartons: 30 })!;
  assert.equal(big.fee, 1500 + 2 * 4500);
  const pack = packItems([{ ...item, cartonQty: 0, qty: 100 }]);
  assert.equal(pack.weightKg, 13.2);
  assert.equal(quoteShipping(rates, "air", pack)!.fee, 300 + 13.5 * 180);
  assert.equal(quoteShipping([], "air", pack), null);
});
