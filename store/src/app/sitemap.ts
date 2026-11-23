import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000")).replace(/\/$/, "");
  const [products, cats] = await Promise.all([
    db.select({ slug: schema.products.slug }).from(schema.products).where(eq(schema.products.active, true)),
    db.select({ slug: schema.categories.slug }).from(schema.categories),
  ]);
  return [
    { url: `${base}/`, priority: 1 }, { url: `${base}/products`, priority: 0.9 }, { url: `${base}/guide`, priority: 0.5 },
    ...cats.map((c) => ({ url: `${base}/products?category=${encodeURIComponent(c.slug)}`, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, priority: 0.6 })),
  ];
}
