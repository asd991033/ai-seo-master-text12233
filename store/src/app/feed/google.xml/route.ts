import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { site } from "@/config/site";
import { siteOrigin } from "@/lib/ecpay";

export const dynamic = "force-dynamic";
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const plain = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Google Merchant Center 商品 Feed（RSS 2.0）。價格是 1 件的含稅售價，與商品頁一致 */
export async function GET(req: Request) {
  const base = siteOrigin(req);
  const rows = await db
    .select({
      sku: schema.products.sku, slug: schema.products.slug, name: schema.products.name, summary: schema.products.summary, description: schema.products.description,
      images: schema.products.images, category: schema.categories.name,
      price: sql<number | null>`(select unit_price from price_tiers where product_id = ${schema.products.id} order by min_qty asc limit 1)`,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.products.categoryId))
    .where(eq(schema.products.active, true));
  const ship = site.flatShipping.fee >= 0 ? `<g:shipping><g:country>TW</g:country><g:price>${site.flatShipping.fee} ${site.currency}</g:price></g:shipping>` : "";
  const items = rows.flatMap((p) => {
    const imgs = ((p.images ?? []) as string[]).map((u) => (u.startsWith("/") ? base + u : u));
    if (!p.price || !imgs[0]) return [];
    const desc = plain(p.description || p.summary || p.name).slice(0, 4800) || p.name;
    return [`<item><g:id>${esc(p.sku)}</g:id><g:title>${esc(p.name.slice(0, 150))}</g:title><g:description>${esc(desc)}</g:description><g:link>${base}/products/${esc(p.slug)}</g:link><g:image_link>${esc(imgs[0])}</g:image_link>${imgs.slice(1, 6).map((u) => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`).join("")}<g:availability>in_stock</g:availability><g:price>${Math.round(p.price)} ${site.currency}</g:price><g:brand>${esc(site.brand)}</g:brand><g:condition>new</g:condition><g:identifier_exists>no</g:identifier_exists><g:is_bundle>no</g:is_bundle>${p.category ? `<g:product_type>${esc(p.category)}</g:product_type>` : ""}${ship}</item>`];
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${esc(site.brand)}</title><link>${base}</link><description>${esc(site.brand)} 商品</description>\n${items.join("\n")}\n</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
