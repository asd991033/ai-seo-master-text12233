import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { baseUrl } from "@/lib/seo";
import { localize, marketList, markets } from "@/config/markets";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const [products, cats, posts] = await Promise.all([
    db.select({ slug: schema.products.slug, images: schema.products.images, sample: schema.products.sampleImage }).from(schema.products).where(eq(schema.products.active, true)),
    db.select({ slug: schema.categories.slug }).from(schema.categories),
    db.select({ slug: schema.posts.slug, updatedAt: schema.posts.updatedAt, market: schema.posts.market }).from(schema.posts).where(eq(schema.posts.published, true)),
  ]);
  const img = (u: unknown) => (typeof u === "string" && u ? [u.startsWith("/") ? base + u : u] : undefined);
  const url = (path: string, code: keyof typeof markets) => `${base}${localize(path, markets[code]) || "/"}`.replace(/&/g, "&amp;");
  // 每個頁面在各國站各有一個網址，並互相標示 hreflang
  const each = (path: string, extra: Omit<MetadataRoute.Sitemap[number], "url">) =>
    marketList.map((m) => ({ url: url(path, m.code), ...extra, alternates: { languages: Object.fromEntries(marketList.map((x) => [x.lang, url(path, x.code)])) } }));
  return [
    ...each("/", { priority: 1, changeFrequency: "weekly" }),
    ...each("/products", { priority: 0.9, changeFrequency: "daily" }),
    ...each("/blog", { priority: 0.7, changeFrequency: "weekly" }),
    ...each("/guide", { priority: 0.5, changeFrequency: "monthly" }),
    ...each("/returns", { priority: 0.3, changeFrequency: "yearly" }),
    ...cats.flatMap((c) => each(`/products?category=${encodeURIComponent(c.slug)}`, { priority: 0.7, changeFrequency: "weekly" })),
    ...posts.filter((p) => p.market in markets).map((p) => ({ url: url(`/blog/${p.slug}`, p.market as keyof typeof markets), priority: 0.6, lastModified: new Date(p.updatedAt * 1000) })),
    ...products.flatMap((p) => each(`/products/${p.slug}`, { priority: 0.6, changeFrequency: "weekly", images: img(p.sample ?? (p.images as string[] | null)?.[0]) })),
  ];
}
