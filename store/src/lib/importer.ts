/**
 * 產品批量匯入（後台上傳 Excel 與 seed 共用）。
 * 以 SKU 為主鍵 upsert；某 SKU 只要出現在某張工作表，該 SKU 在那張表的資料就整批以新資料取代。
 */
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db, schema } from "@/db";
import { DEFAULT_MARGIN, priceFromCost } from "./pricing";

const { products, categories, priceTiers, printPositions, printAreas, printPrices, printMethods } = schema;

export type ProductRow = {
  sku: string; name: string; category?: string; summary?: string; description?: string; material?: string; size?: string;
  /** 例：米白:#F2EDE4|黑:#111111 */
  colors?: string;
  moq?: number; leadDays?: number; unitWeightG?: number;
  cartonQty?: number; cartonLengthCm?: number; cartonWidthCm?: number; cartonHeightCm?: number; cartonWeightKg?: number;
  featured?: boolean; active?: boolean;
  /** 以 | 分隔的圖片網址；留空則保留既有圖片 */
  images?: string;
};
/** unitCost 有填時，售價由毛利率自動換算（unitPrice 可留空） */
export type TierRow = { sku: string; minQty: number; unitPrice?: number; unitCost?: number };
export type AreaRow = {
  sku: string; positionCode: string; positionName: string; dielineWidthMm: number; dielineHeightMm: number;
  dielineUrl?: string; mockupUrl?: string; mockupX?: number; mockupY?: number; mockupW?: number; mockupH?: number;
  areaCode: string; areaName: string; xMm: number; yMm: number; widthMm: number; heightMm: number;
};
export type PrintPriceRow = { sku: string; positionCode: string; areaCode: string; methodCode: string; minQty: number; unitPrice: number; setupFee?: number };

export type ImportData = { products: ProductRow[]; tiers: TierRow[]; areas: AreaRow[]; printPrices: PrintPriceRow[] };
export type ImportResult = { ok: boolean; errors: string[]; counts: { products: number; tiers: number; areas: number; printPrices: number } };

export const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function parseColors(s?: string) {
  return (s ?? "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [name, hex] = x.split(":").map((y) => y.trim());
      return { name, hex: /^#[0-9a-fA-F]{3,8}$/.test(hex ?? "") ? hex : "#cccccc" };
    });
}

const pos = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n > 0;
const nonNeg = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0;

export function validate(data: ImportData): string[] {
  const errors: string[] = [];
  const seenSku = new Set<string>();
  data.products.forEach((r, i) => {
    const at = `「產品」第 ${i + 2} 列`;
    if (!r.sku) errors.push(`${at}：缺少 SKU`);
    else if (!slugify(r.sku)) errors.push(`${at}：SKU 需包含英數字`);
    else if (seenSku.has(r.sku)) errors.push(`${at}：SKU ${r.sku} 重複`);
    seenSku.add(r.sku);
    if (!r.name) errors.push(`${at}：缺少品名`);
  });
  data.tiers.forEach((r, i) => {
    const at = `「區間價格」第 ${i + 2} 列`;
    if (!r.sku) errors.push(`${at}：缺少 SKU`);
    if (!pos(r.minQty) || !Number.isInteger(r.minQty)) errors.push(`${at}：起始數量需為正整數`);
    if (r.unitCost == null && r.unitPrice == null) errors.push(`${at}：「成本價」與「單價」至少填一個`);
    if ((r.unitCost != null && !nonNeg(r.unitCost)) || (r.unitPrice != null && !nonNeg(r.unitPrice))) errors.push(`${at}：成本價或單價格式錯誤`);
  });
  data.areas.forEach((r, i) => {
    const at = `「印刷區域」第 ${i + 2} 列`;
    if (!r.sku || !r.positionCode || !r.areaCode) errors.push(`${at}：SKU、位置代碼、面積代碼必填`);
    if (!pos(r.dielineWidthMm) || !pos(r.dielineHeightMm)) errors.push(`${at}：刀模寬高需為正數 (mm)`);
    if (!nonNeg(r.xMm) || !nonNeg(r.yMm) || !pos(r.widthMm) || !pos(r.heightMm)) errors.push(`${at}：印刷範圍座標/尺寸錯誤`);
    else if (r.xMm + r.widthMm > r.dielineWidthMm + 0.01 || r.yMm + r.heightMm > r.dielineHeightMm + 0.01)
      errors.push(`${at}：印刷範圍超出刀模尺寸`);
  });
  data.printPrices.forEach((r, i) => {
    const at = `「印刷報價」第 ${i + 2} 列`;
    if (!r.sku || !r.positionCode || !r.areaCode || !r.methodCode) errors.push(`${at}：SKU、位置、面積、印刷方式代碼必填`);
    if (!pos(r.minQty) || !Number.isInteger(r.minQty)) errors.push(`${at}：起始數量需為正整數`);
    if (!nonNeg(r.unitPrice) || !nonNeg(r.setupFee ?? 0)) errors.push(`${at}：單價或版費格式錯誤`);
  });
  return errors;
}

export async function importCatalog(data: ImportData): Promise<ImportResult> {
  const counts = { products: 0, tiers: 0, areas: 0, printPrices: 0 };
  const errors = validate(data);
  if (errors.length) return { ok: false, errors, counts };

  try {
    await db.transaction(async (tx) => {
      // ---- 分類 ----
      const catByName = new Map((await tx.select().from(categories)).map((c) => [c.name, c.id]));
      for (const name of new Set(data.products.map((p) => p.category?.trim()).filter((x): x is string => !!x))) {
        if (catByName.has(name)) continue;
        const slug = slugify(name) || `c-${createHash("md5").update(name).digest("hex").slice(0, 8)}`;
        const [row] = await tx.insert(categories).values({ name, slug, sort: catByName.size }).returning();
        catByName.set(name, row.id);
      }

      // ---- 產品 ----
      for (const r of data.products) {
        const values = {
          sku: r.sku.trim(), slug: slugify(r.sku), name: r.name.trim(),
          categoryId: r.category ? catByName.get(r.category.trim()) ?? null : null,
          summary: r.summary ?? "", description: r.description ?? "", material: r.material ?? "", sizeText: r.size ?? "",
          colors: parseColors(r.colors),
          moq: r.moq || 1, leadDays: r.leadDays || 14, unitWeightG: r.unitWeightG || 0,
          cartonQty: r.cartonQty || 0, cartonLengthCm: r.cartonLengthCm || 0, cartonWidthCm: r.cartonWidthCm || 0,
          cartonHeightCm: r.cartonHeightCm || 0, cartonWeightKg: r.cartonWeightKg || 0,
          featured: !!r.featured, active: r.active ?? true,
        };
        const images = (r.images ?? "").split("|").map((x) => x.trim()).filter(Boolean);
        await tx
          .insert(products)
          .values({ ...values, images })
          .onConflictDoUpdate({ target: products.sku, set: images.length ? { ...values, images } : values });
        counts.products++;
      }

      const allSkus = [...new Set([...data.tiers, ...data.areas, ...data.printPrices].map((r) => r.sku.trim()))];
      const idBySku = new Map(
        allSkus.length ? (await tx.select({ id: products.id, sku: products.sku }).from(products).where(inArray(products.sku, allSkus))).map((p) => [p.sku, p.id]) : [],
      );
      const pid = (sku: string, sheet: string) => {
        const id = idBySku.get(sku.trim());
        if (!id) throw new Error(`「${sheet}」：找不到 SKU ${sku}（請先在「產品」工作表建立）`);
        return id;
      };

      // ---- 區間價格 ----
      const [m] = await tx.select().from(schema.settings).where(eq(schema.settings.key, "margin_rate"));
      const margin = m ? Number(m.value) : DEFAULT_MARGIN;
      for (const sku of new Set(data.tiers.map((r) => r.sku.trim()))) {
        await tx.delete(priceTiers).where(eq(priceTiers.productId, pid(sku, "區間價格")));
      }
      for (const r of data.tiers) {
        const unitCost = r.unitCost ?? null;
        const unitPrice = unitCost != null ? priceFromCost(unitCost, margin) : r.unitPrice!;
        await tx.insert(priceTiers).values({ productId: pid(r.sku, "區間價格"), minQty: r.minQty, unitPrice, unitCost })
          .onConflictDoUpdate({ target: [priceTiers.productId, priceTiers.minQty], set: { unitPrice, unitCost } });
        counts.tiers++;
      }

      // ---- 印刷位置 / 面積 ----
      for (const sku of new Set(data.areas.map((r) => r.sku.trim()))) {
        const productId = pid(sku, "印刷區域");
        const rows = data.areas.filter((r) => r.sku.trim() === sku);
        const keepPos: number[] = [];
        const posCodes = [...new Set(rows.map((r) => r.positionCode.trim()))];
        for (const [pi, code] of posCodes.entries()) {
          const first = rows.find((r) => r.positionCode.trim() === code)!;
          const base = { name: first.positionName || code, widthMm: first.dielineWidthMm, heightMm: first.dielineHeightMm, sort: pi };
          const optional = {
            ...(first.dielineUrl ? { dielineUrl: first.dielineUrl } : {}),
            ...(first.mockupUrl ? { mockupUrl: first.mockupUrl } : {}),
            ...(first.mockupW ? { mockupX: first.mockupX ?? 0, mockupY: first.mockupY ?? 0, mockupW: first.mockupW, mockupH: first.mockupH ?? 1 } : {}),
          };
          const [p] = await tx.insert(printPositions).values({ productId, code, ...base, ...optional })
            .onConflictDoUpdate({ target: [printPositions.productId, printPositions.code], set: { ...base, ...optional } }).returning();
          keepPos.push(p.id);
          const keepArea: number[] = [];
          for (const [ai, a] of rows.filter((r) => r.positionCode.trim() === code).entries()) {
            const av = { name: a.areaName || a.areaCode, xMm: a.xMm, yMm: a.yMm, widthMm: a.widthMm, heightMm: a.heightMm, sort: ai };
            const [row] = await tx.insert(printAreas).values({ positionId: p.id, code: a.areaCode.trim(), ...av })
              .onConflictDoUpdate({ target: [printAreas.positionId, printAreas.code], set: av }).returning();
            keepArea.push(row.id);
            counts.areas++;
          }
          const stale = await tx.select({ id: printAreas.id }).from(printAreas).where(and(eq(printAreas.positionId, p.id), notInArray(printAreas.id, keepArea)));
          if (stale.length) {
            await tx.delete(printPrices).where(inArray(printPrices.areaId, stale.map((s) => s.id)));
            await tx.delete(printAreas).where(inArray(printAreas.id, stale.map((s) => s.id)));
          }
        }
        const stalePos = await tx.select({ id: printPositions.id }).from(printPositions).where(and(eq(printPositions.productId, productId), notInArray(printPositions.id, keepPos)));
        if (stalePos.length) {
          const ids = stalePos.map((s) => s.id);
          const staleAreas = (await tx.select({ id: printAreas.id }).from(printAreas).where(inArray(printAreas.positionId, ids))).map((a) => a.id);
          if (staleAreas.length) await tx.delete(printPrices).where(inArray(printPrices.areaId, staleAreas));
          await tx.delete(printAreas).where(inArray(printAreas.positionId, ids));
          await tx.delete(printPositions).where(inArray(printPositions.id, ids));
        }
      }

      // ---- 印刷報價 ----
      const methodByCode = new Map((await tx.select().from(printMethods)).map((m) => [m.code, m.id]));
      for (const sku of new Set(data.printPrices.map((r) => r.sku.trim()))) {
        const productId = pid(sku, "印刷報價");
        await tx.delete(printPrices).where(eq(printPrices.productId, productId));
        const poss = await tx.select().from(printPositions).where(eq(printPositions.productId, productId));
        const areas = poss.length ? await tx.select().from(printAreas).where(inArray(printAreas.positionId, poss.map((p) => p.id))) : [];
        for (const r of data.printPrices.filter((x) => x.sku.trim() === sku)) {
          const p = poss.find((x) => x.code === r.positionCode.trim());
          const a = p && areas.find((x) => x.positionId === p.id && x.code === r.areaCode.trim());
          const methodId = methodByCode.get(r.methodCode.trim());
          if (!a) throw new Error(`「印刷報價」：SKU ${sku} 找不到位置 ${r.positionCode} / 面積 ${r.areaCode}`);
          if (!methodId) throw new Error(`「印刷報價」：找不到印刷方式代碼 ${r.methodCode}（請先到後台「印刷方式」新增）`);
          await tx.insert(printPrices).values({ productId, areaId: a.id, methodId, minQty: r.minQty, unitPrice: r.unitPrice, setupFee: r.setupFee ?? 0 })
            .onConflictDoUpdate({ target: [printPrices.areaId, printPrices.methodId, printPrices.minQty], set: { unitPrice: r.unitPrice, setupFee: r.setupFee ?? 0 } });
          counts.printPrices++;
        }
      }
    });
  } catch (e) {
    return { ok: false, errors: [(e as Error).message], counts: { products: 0, tiers: 0, areas: 0, printPrices: 0 } };
  }
  return { ok: true, errors: [], counts };
}
