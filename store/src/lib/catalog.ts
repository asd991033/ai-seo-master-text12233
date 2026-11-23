import "server-only";
import { and, asc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ProductPricing, Tier } from "./pricing";
import type { RateRow } from "./shipping";
import { toLocal, type Market } from "@/config/markets";
import { currentMarket } from "@/market/server";
import { term } from "@/i18n/terms";
import { localizeText, pricingFor, searchEn } from "./localize";

const { products, priceTiers, printPositions, printAreas, printPrices, printMethods, categories, shippingZones, shippingRates } = schema;

export type Product = typeof products.$inferSelect;
export type Area = typeof printAreas.$inferSelect;
export type Position = typeof printPositions.$inferSelect & { areas: Area[] };
export type Method = typeof printMethods.$inferSelect;
export type ProductFull = Product & {
  categoryName: string | null;
  categorySlug: string | null;
  positions: Position[];
  methods: Method[];
  pricing: ProductPricing;
};

export async function listCategories() {
  return db.select().from(categories).orderBy(asc(categories.sort), asc(categories.id));
}

export type ProductCard = Pick<Product, "id" | "slug" | "sku" | "name" | "summary" | "images" | "moq" | "colors" | "sampleImage"> & {
  tiers: Tier[];
  categoryName: string | null;
};

export const PAGE_SIZE = 48;

export async function countProducts(opts: { category?: string; q?: string } = {}, m: Market = currentMarket()): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(products).leftJoin(categories, eq(categories.id, products.categoryId)).where(and(...productConds(opts, m)));
  return r.n;
}

function productConds(opts: { category?: string; q?: string; featured?: boolean; exclude?: number }, m: Market) {
  const conds = [eq(products.active, true)];
  // 海外站只上架有英文資料的商品
  if (m.locale === "en") conds.push(like(products.sku, "HC-%"));
  if (opts.category) conds.push(eq(categories.slug, opts.category));
  if (opts.exclude) conds.push(sql`${products.id} != ${opts.exclude}`);
  if (opts.featured) conds.push(eq(products.featured, true));
  if (opts.q?.trim()) {
    const kw = `%${opts.q.trim().replace(/[%_]/g, "")}%`;
    if (m.locale === "en") {
      // 英文站搜尋英文品名（資料庫裡的品名是中文）
      const skus = searchEn(opts.q).slice(0, 400);
      conds.push(skus.length ? or(inArray(products.sku, skus), like(products.sku, kw))! : like(products.sku, kw));
    } else conds.push(or(like(products.name, kw), like(products.sku, kw), like(products.summary, kw))!);
  }
  return conds;
}

export async function listProducts(opts: { category?: string; q?: string; sort?: string; featured?: boolean; limit?: number; page?: number; exclude?: number } = {}, m: Market = currentMarket()): Promise<ProductCard[]> {
  const conds = productConds(opts, m);
  const rows = await db
    .select({
      id: products.id, slug: products.slug, sku: products.sku, name: products.name, summary: products.summary,
      images: products.images, moq: products.moq, colors: products.colors, categoryName: categories.name, sampleImage: products.sampleImage,
      minPrice: sql<number | null>`(select min(unit_price) from price_tiers where product_id = ${products.id})`,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conds))
    .orderBy(
      opts.sort === "price_asc" ? sql`(select min(unit_price) from price_tiers where product_id = ${products.id}) asc`
      : opts.sort === "price_desc" ? sql`(select min(unit_price) from price_tiers where product_id = ${products.id}) desc`
      : sql`${products.popularity} desc, ${products.id} desc`,
    )
    .limit(opts.limit ?? PAGE_SIZE)
    .offset(Math.max(0, (opts.page ?? 1) - 1) * (opts.limit ?? PAGE_SIZE));
  if (!rows.length) return [];
  const tiers = await db.select().from(priceTiers).where(inArray(priceTiers.productId, rows.map((r) => r.id))).orderBy(asc(priceTiers.minQty));
  return rows.map((r) => localizeText({ ...r, tiers: tiers.filter((t) => t.productId === r.id).map((t) => ({ minQty: t.minQty, unitPrice: toLocal(t.unitPrice, m) })) }, m));
}

async function hydrate(rows: (Product & { categoryName: string | null; categorySlug: string | null })[], m: Market): Promise<ProductFull[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [tiers, positions, prices, methods] = await Promise.all([
    db.select().from(priceTiers).where(inArray(priceTiers.productId, ids)).orderBy(asc(priceTiers.minQty)),
    db.select().from(printPositions).where(inArray(printPositions.productId, ids)).orderBy(asc(printPositions.sort), asc(printPositions.id)),
    db.select().from(printPrices).where(inArray(printPrices.productId, ids)).orderBy(asc(printPrices.minQty)),
    db.select().from(printMethods).orderBy(asc(printMethods.sort), asc(printMethods.id)),
  ]);
  const areas = positions.length
    ? await db.select().from(printAreas).where(inArray(printAreas.positionId, positions.map((p) => p.id))).orderBy(asc(printAreas.sort), asc(printAreas.id))
    : [];
  const areaById = new Map(areas.map((a) => [a.id, a]));
  const posById = new Map(positions.map((p) => [p.id, p]));
  const methodById = new Map(methods.map((m) => [m.id, m]));

  return rows.map((r) => {
    const myPositions = positions.filter((p) => p.productId === r.id).map((p) => ({ ...p, areas: areas.filter((a) => a.positionId === p.id) }));
    const myPrices = prices.filter((x) => x.productId === r.id);
    const usedMethods = methods.filter((m) => myPrices.some((x) => x.methodId === m.id));
    const loc = (x: string) => term(x, m.locale);
    return {
      ...localizeText(r, m),
      positions: myPositions.filter((p) => p.areas.length > 0).map((p) => (m.locale === "en" ? { ...p, name: loc(p.name), areas: p.areas.map((a) => ({ ...a, name: loc(a.name) })) } : p)),
      methods: m.locale === "en" ? usedMethods.map((x) => ({ ...x, name: loc(x.name) })) : usedMethods,
      pricing: pricingFor({
        moq: r.moq,
        ...(r.variantPrices ? { variants: Object.fromEntries(Object.entries(r.variantPrices).map(([k, rows]) => [k, rows.map(([minQty, unitPrice]) => ({ minQty, unitPrice }))])) } : {}),
        ...(r.extraFacePrice > 0 ? { extraFacePrice: r.extraFacePrice } : {}),
        tiers: tiers.filter((t) => t.productId === r.id).map((t) => ({ minQty: t.minQty, unitPrice: t.unitPrice })),
        methods: usedMethods.map((m) => ({ code: m.code, name: m.name, perColor: m.perColor, maxColors: m.maxColors })),
        printPrices: myPrices.flatMap((x) => {
          const area = areaById.get(x.areaId);
          const pos = area && posById.get(area.positionId);
          const method = methodById.get(x.methodId);
          return area && pos && method
            ? [{ positionCode: pos.code, areaCode: area.code, methodCode: method.code, minQty: x.minQty, unitPrice: x.unitPrice, setupFee: x.setupFee }]
            : [];
        }),
      }, m, r.colors.map((c) => c.name), r.sizes),
    };
  });
}

const fullSelect = () =>
  db
    .select({ p: products, categoryName: categories.name, categorySlug: categories.slug })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId));

export async function getProductBySlug(slug: string, m: Market = currentMarket()): Promise<ProductFull | null> {
  const rows = await fullSelect().where(and(eq(products.slug, slug), eq(products.active, true), ...(m.locale === "en" ? [like(products.sku, "HC-%")] : []))).limit(1);
  return (await hydrate(rows.map((r) => ({ ...r.p, categoryName: r.categoryName, categorySlug: r.categorySlug })), m))[0] ?? null;
}

export async function getProductsByIds(ids: number[], m: Market = currentMarket()): Promise<ProductFull[]> {
  if (!ids.length) return [];
  const rows = await fullSelect().where(and(inArray(products.id, ids), eq(products.active, true)));
  return hydrate(rows.map((r) => ({ ...r.p, categoryName: r.categoryName, categorySlug: r.categorySlug })), m);
}

export async function categoryCounts(m: Market = currentMarket()) {
  const rows = await categoryRows();
  return m.locale === "en" ? rows.map((c) => ({ ...c, name: term(c.name, "en") })) : rows;
}
function categoryRows() {
  return db
    .select({ id: categories.id, slug: categories.slug, name: categories.name, count: sql<number>`count(${products.id})`, image: sql<string | null>`(select json_extract(p2.images, '$[0]') from products p2 where p2.category_id = ${categories.id} and p2.active = 1 order by p2.popularity desc limit 1)` })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.active, true)))
    .groupBy(categories.id)
    .orderBy(sql`count(${products.id}) desc`);
}

export type Zone = { code: string; name: string; rates: RateRow[] };

export async function listZones(): Promise<Zone[]> {
  const [zones, rates] = await Promise.all([
    db.select().from(shippingZones).orderBy(asc(shippingZones.sort), asc(shippingZones.id)),
    db.select().from(shippingRates).orderBy(asc(shippingRates.minUnits)),
  ]);
  return zones.map((z) => ({
    code: z.code,
    name: z.name,
    rates: rates.filter((r) => r.zoneId === z.id).map(({ mode, minUnits, rate, baseFee, minCharge, daysMin, daysMax }) => ({ mode, minUnits, rate, baseFee, minCharge, daysMin, daysMax })),
  }));
}
