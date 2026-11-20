import "server-only";
import { and, asc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ProductPricing, Tier } from "./pricing";
import type { RateRow } from "./shipping";

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

export type ProductCard = Pick<Product, "id" | "slug" | "sku" | "name" | "summary" | "images" | "moq" | "colors"> & {
  tiers: Tier[];
  categoryName: string | null;
};

export async function listProducts(opts: { category?: string; q?: string; sort?: string; featured?: boolean; limit?: number } = {}): Promise<ProductCard[]> {
  const conds = [eq(products.active, true)];
  if (opts.category) conds.push(eq(categories.slug, opts.category));
  if (opts.featured) conds.push(eq(products.featured, true));
  if (opts.q?.trim()) {
    const kw = `%${opts.q.trim().replace(/[%_]/g, "")}%`;
    conds.push(or(like(products.name, kw), like(products.sku, kw), like(products.summary, kw))!);
  }
  const rows = await db
    .select({
      id: products.id, slug: products.slug, sku: products.sku, name: products.name, summary: products.summary,
      images: products.images, moq: products.moq, colors: products.colors, categoryName: categories.name,
      minPrice: sql<number | null>`(select min(unit_price) from price_tiers where product_id = ${products.id})`,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conds))
    .orderBy(
      opts.sort === "price_asc" ? sql`(select min(unit_price) from price_tiers where product_id = ${products.id}) asc`
      : opts.sort === "price_desc" ? sql`(select min(unit_price) from price_tiers where product_id = ${products.id}) desc`
      : sql`${products.featured} desc, ${products.id} desc`,
    )
    .limit(opts.limit ?? 200);
  if (!rows.length) return [];
  const tiers = await db.select().from(priceTiers).where(inArray(priceTiers.productId, rows.map((r) => r.id))).orderBy(asc(priceTiers.minQty));
  return rows.map((r) => ({ ...r, tiers: tiers.filter((t) => t.productId === r.id).map((t) => ({ minQty: t.minQty, unitPrice: t.unitPrice })) }));
}

async function hydrate(rows: (Product & { categoryName: string | null; categorySlug: string | null })[]): Promise<ProductFull[]> {
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
    return {
      ...r,
      positions: myPositions.filter((p) => p.areas.length > 0),
      methods: usedMethods,
      pricing: {
        moq: r.moq,
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
      },
    };
  });
}

const fullSelect = () =>
  db
    .select({ p: products, categoryName: categories.name, categorySlug: categories.slug })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId));

export async function getProductBySlug(slug: string): Promise<ProductFull | null> {
  const rows = await fullSelect().where(and(eq(products.slug, slug), eq(products.active, true))).limit(1);
  return (await hydrate(rows.map((r) => ({ ...r.p, categoryName: r.categoryName, categorySlug: r.categorySlug }))))[0] ?? null;
}

export async function getProductsByIds(ids: number[]): Promise<ProductFull[]> {
  if (!ids.length) return [];
  const rows = await fullSelect().where(and(inArray(products.id, ids), eq(products.active, true)));
  return hydrate(rows.map((r) => ({ ...r.p, categoryName: r.categoryName, categorySlug: r.categorySlug })));
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
