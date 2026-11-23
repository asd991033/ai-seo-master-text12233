import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { baseUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const [products, cats, posts] = await Promise.all([
    db.select({ slug: schema.products.slug, images: schema.products.images }).from(schema.products).where(eq(schema.products.active, true)),
    db.select({ slug: schema.categories.slug }).from(schema.categories),
    db.select({ slug: schema.posts.slug, updatedAt: schema.posts.updatedAt }).from(schema.posts).where(eq(schema.posts.published, true)),
  ]);
  const img = (u: unknown) => (typeof u === "string" && u ? [u.startsWith("/") ? base + u : u] : undefined);
  return [
    { url: `${base}/`, priority: 1, changeFrequency: "weekly" },
    { url: `${base}/products`, priority: 0.9, changeFrequency: "daily" },
    { url: `${base}/blog`, priority: 0.7, changeFrequency: "weekly" },
    { url: `${base}/guide`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${base}/returns`, priority: 0.3, changeFrequency: "yearly" },
    ...cats.map((c) => ({ url: `${base}/products?category=${encodeURIComponent(c.slug)}`, priority: 0.7, changeFrequency: "weekly" as const })),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, priority: 0.6, lastModified: new Date(p.updatedAt * 1000) })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, priority: 0.6, changeFrequency: "weekly" as const, images: img((p.images as string[] | null)?.[0]) })),
  ];
}
