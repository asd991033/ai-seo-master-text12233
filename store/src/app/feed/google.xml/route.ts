import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { site } from "@/config/site";
import { siteOrigin } from "@/lib/ecpay";
import { dictFor } from "@/i18n";
import { withMarket } from "@/market/server";
import { localize, toLocal, type Market } from "@/config/markets";
import { localizeText } from "@/lib/localize";

export const dynamic = "force-dynamic";
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const plain = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Google Merchant Center 商品 Feed（RSS 2.0）。價格是 1 件的含稅售價，與商品頁一致 */
export function GET(req: Request) {
  return withMarket(req, (m) => feed(req, m));
}

/** 各國站各有一份 Feed（/sg/feed/google.xml…），語言、幣別、運費都依該國 */
async function feed(req: Request, m: Market) {
  const base = siteOrigin(req), T = dictFor(m).meta;
  const rows = await db
    .select({
      sku: schema.products.sku, slug: schema.products.slug, name: schema.products.name, material: schema.products.material, summary: schema.products.summary, description: schema.products.description,
      images: schema.products.images, category: schema.categories.name, sample: schema.products.sampleImage,
      price: sql<number | null>`(select unit_price from price_tiers where product_id = ${schema.products.id} order by min_qty asc limit 1)`,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.products.categoryId))
    .where(eq(schema.products.active, true));
  const ship = m.shipping.fee >= 0 ? `<g:shipping><g:country>${m.country}</g:country><g:price>${m.shipping.fee} ${m.currency}</g:price></g:shipping>` : "";
  const price = (twd: number) => (m.code === "tw" ? String(Math.round(twd)) : toLocal(twd, m).toFixed(2));
  const items = rows.flatMap((row) => {
    const p = { ...localizeText({ ...row, categoryName: row.category }, m) };
    const material = (p.material ?? "").replace(/[（(].*?[）)]/g, "").trim();
    // 主圖優先用印上範例圖案的成品圖：畫面乾淨，沒有「YOUR DESIGN HERE」這類疊加文字
    const imgs = [...(p.sample ? [p.sample] : []), ...((p.images ?? []) as string[])].map((u) => (u.startsWith("/") ? base + u : u));
    if (!p.price || !imgs[0]) return [];
    const desc = `${T.feedDesc(p.name)}${plain((p.description || p.summary || "").replace(/[【】｜＊]/g, " "))}`.slice(0, 4800);
    return [`<item><g:id>${esc(p.sku)}</g:id><g:title>${esc(T.feedTitle(p.name, material).slice(0, 150))}</g:title><g:description>${esc(desc)}</g:description><g:link>${base}${localize(`/products/${esc(p.slug)}`, m)}</g:link><g:image_link>${esc(imgs[0])}</g:image_link>${imgs.slice(1, 6).map((u) => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`).join("")}<g:availability>in_stock</g:availability><g:price>${price(p.price)} ${m.currency}</g:price><g:brand>${esc(site.brand)}</g:brand><g:condition>new</g:condition><g:identifier_exists>no</g:identifier_exists><g:is_bundle>no</g:is_bundle>${p.categoryName ? `<g:product_type>${esc(p.categoryName)}</g:product_type>` : ""}${ship}</item>`];
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${esc(site.brand)}</title><link>${base}${m.prefix}</link><description>${esc(site.brand)} ${T.feedChannel}</description>\n${items.join("\n")}\n</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
