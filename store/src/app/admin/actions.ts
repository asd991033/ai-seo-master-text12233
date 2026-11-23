"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, isNotNull } from "drizzle-orm";
import { priceFromCost } from "@/lib/pricing";
import { getPricingSettings, setSetting } from "@/lib/settings";
import { derivePrices } from "@/lib/importer";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

const num = (v: FormDataEntryValue | null, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const STATUSES = ["pending_payment", "reviewing", "in_production", "shipped", "completed", "cancelled"] as const;

export async function updateOrder(fd: FormData) {
  await requireAdmin();
  const id = num(fd.get("id"));
  const status = STATUSES.find((s) => s === fd.get("status"));
  if (!id || !status) return;
  await db.update(schema.orders).set({ status, paid: fd.get("paid") === "on", trackingNo: String(fd.get("trackingNo") ?? "").trim().slice(0, 80) || null }).where(eq(schema.orders.id, id));
  revalidatePath(`/admin/orders/${id}`);
}

export async function toggleProduct(fd: FormData) {
  await requireAdmin();
  const id = num(fd.get("id"));
  const field = fd.get("field") === "featured" ? "featured" : "active";
  const [p] = await db.select().from(schema.products).where(eq(schema.products.id, id));
  if (!p) return;
  await db.update(schema.products).set({ [field]: !p[field] }).where(eq(schema.products.id, id));
  revalidatePath("/admin/products");
}

/** 整區運費表以表單內容取代（空白列略過） */
export async function saveZoneRates(fd: FormData) {
  await requireAdmin();
  const zoneId = num(fd.get("zoneId"));
  const name = String(fd.get("name") ?? "").trim();
  if (!zoneId || !name) return;
  const col = (k: string) => fd.getAll(k);
  const modes = col("mode"), min = col("minUnits"), rate = col("rate"), base = col("baseFee"), minCharge = col("minCharge"), d1 = col("daysMin"), d2 = col("daysMax");
  const seen = new Set<string>();
  const rows = modes.flatMap((m, i) => {
    const mode = m === "sea" ? ("sea" as const) : ("air" as const);
    if (String(rate[i] ?? "").trim() === "") return [];
    const key = `${mode}:${num(min[i])}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ zoneId, mode, minUnits: Math.max(0, num(min[i])), rate: Math.max(0, num(rate[i])), baseFee: Math.max(0, num(base[i])), minCharge: Math.max(0, num(minCharge[i])), daysMin: num(d1[i]), daysMax: num(d2[i]) }];
  });
  await db.transaction(async (tx) => {
    await tx.update(schema.shippingZones).set({ name }).where(eq(schema.shippingZones.id, zoneId));
    await tx.delete(schema.shippingRates).where(eq(schema.shippingRates.zoneId, zoneId));
    if (rows.length) await tx.insert(schema.shippingRates).values(rows);
  });
  revalidatePath("/admin/shipping");
}

export async function addZone(fd: FormData) {
  await requireAdmin();
  const code = String(fd.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const name = String(fd.get("name") ?? "").trim();
  if (!code || !name) return;
  await db.insert(schema.shippingZones).values({ code, name, sort: 99 }).onConflictDoNothing();
  revalidatePath("/admin/shipping");
}

export async function saveMethod(fd: FormData) {
  await requireAdmin();
  const code = String(fd.get("code") ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const name = String(fd.get("name") ?? "").trim();
  if (!code || !name) return;
  const values = { name, description: String(fd.get("description") ?? "").trim(), perColor: fd.get("perColor") === "on", maxColors: Math.max(1, Math.floor(num(fd.get("maxColors"), 1))), sort: Math.floor(num(fd.get("sort"))) };
  await db.insert(schema.printMethods).values({ code, ...values }).onConflictDoUpdate({ target: schema.printMethods.code, set: values });
  revalidatePath("/admin/methods");
}

/** 更新毛利率，並把所有有成本價的級距重新換算售價 */
export async function saveMargin(fd: FormData) {
  await requireAdmin();
  const pct = num(fd.get("marginPct"), -1);
  if (!(pct >= 0 && pct < 100)) return;
  const rate = pct / 100;
  const cny = num(fd.get("fxCNY"), 0);
  await db.transaction(async (tx) => {
    await setSetting("margin_rate", String(rate), tx);
    if (cny > 0) await setSetting("fx_CNY", String(cny), tx);
    const { fx } = await getPricingSettings(tx);
    const tiers = await tx.select().from(schema.priceTiers).where(isNotNull(schema.priceTiers.unitCost));
    for (const t of tiers) await tx.update(schema.priceTiers).set({ unitPrice: priceFromCost(t.unitCost!, rate, fx(t.costCurrency)) }).where(eq(schema.priceTiers.id, t.id));
    // 各款式售價與加印面售價也一併重算
    const prods = await tx.select({ id: schema.products.id, variantCosts: schema.products.variantCosts, extraFaceCost: schema.products.extraFaceCost, costCurrency: schema.products.costCurrency }).from(schema.products);
    for (const p of prods) {
      if (!p.variantCosts && p.extraFaceCost == null) continue;
      const d = derivePrices(p.variantCosts, p.extraFaceCost, p.costCurrency, rate, fx);
      await tx.update(schema.products).set({ variantPrices: d.variantPrices, extraFacePrice: d.extraFacePrice }).where(eq(schema.products.id, p.id));
    }
  });
  revalidatePath("/admin/pricing");
}

/** 新增或更新部落格文章 */
export async function savePost(fd: FormData) {
  await requireAdmin();
  const str = (k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);
  const title = str("title", 200);
  if (!title) return;
  const id = Number(fd.get("id")) || 0;
  const raw = str("slug", 120) || title;
  const slug = raw.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 120) || `post-${Date.now()}`;
  const values = {
    title, slug, excerpt: str("excerpt", 500), content: String(fd.get("content") ?? "").slice(0, 100_000),
    coverUrl: str("coverUrl", 500) || null, coverAlt: str("coverAlt", 200) || null, seoTitle: str("seoTitle", 200) || null, seoDescription: str("seoDescription", 300) || null,
    published: fd.get("published") === "on", updatedAt: Math.floor(Date.now() / 1000),
  };
  let savedId = id;
  if (id) await db.update(schema.posts).set(values).where(eq(schema.posts.id, id));
  else {
    // 網址代稱重複時加上尾碼
    const clash = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.slug, slug));
    const [row] = await db.insert(schema.posts).values({ ...values, slug: clash.length ? `${slug}-${Date.now().toString(36)}` : slug }).returning();
    savedId = row.id;
  }
  revalidatePath("/blog");
  redirect(`/admin/blog?edit=${savedId}`);
}

export async function deletePost(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  if (id) await db.delete(schema.posts).where(eq(schema.posts.id, id));
  revalidatePath("/blog");
  redirect("/admin/blog");
}

/** 刪除訂單（連同訂單品項）。用於清除測試訂單；刪除後無法復原 */
export async function deleteOrder(fd: FormData) {
  await requireAdmin();
  const id = num(fd.get("id"));
  // 需要輸入訂單編號確認，避免誤刪
  const [order] = id ? await db.select().from(schema.orders).where(eq(schema.orders.id, id)) : [];
  if (!order || String(fd.get("confirm") ?? "").trim() !== order.orderNo) return;
  await db.delete(schema.orderItems).where(eq(schema.orderItems.orderId, id));
  await db.delete(schema.orders).where(eq(schema.orders.id, id));
  revalidatePath("/admin/orders");
  redirect("/admin/orders");
}
