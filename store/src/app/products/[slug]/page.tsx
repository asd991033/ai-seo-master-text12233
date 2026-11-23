import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { abs, baseUrl, breadcrumbLd, faqLd, shippingLd } from "@/lib/seo";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { fmtNum } from "@/lib/format";
import { getProductBySlug, listProducts, listZones } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { Faq, MethodStrip } from "@/components/home/Sections";
import { RichDescription } from "@/components/RichDescription";
import { fmtMoney } from "@/lib/format";
import { priceRange } from "@/lib/pricing";
import { site } from "@/config/site";
import { IconBrush, IconLayers, IconTag, IconTruck } from "@/components/Icons";
import { Configurator } from "@/components/Configurator";
import { Gallery } from "@/components/Gallery";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  const range = priceRange(p.pricing.tiers);
  // 說明帶入價格、起訂量與運送資訊，搜尋結果與 AI 摘要才有具體內容可引用
  const description = [p.summary || p.name, range ? `${site.currencySymbol}${range.min} 起，${p.pricing.moq} 件起訂` : "", "可線上排版、即時看效果圖", `運送約 ${site.flatShipping.days} 個工作天`].filter(Boolean).join("；").slice(0, 155);
  return { title: `${p.name}｜印 Logo 圖案・${p.pricing.moq} 件起訂`, description, alternates: { canonical: `/products/${p.slug}` }, openGraph: { title: p.name, description, type: "website", images: [p.sampleImage ?? p.images[0]].filter(Boolean) as string[] } };
}

export default async function ProductPage({ params }: Props) {
  const [p, zones] = await Promise.all([getProductBySlug((await params).slug), listZones()]);
  if (!p) notFound();
  // 圖片順序：印上圖案的成品範例放第一張，接著才是標示可印範圍的商品照
  const gallery = p.sampleImage ? [p.sampleImage, ...p.images] : p.images;
  const related = p.categorySlug ? await listProducts({ category: p.categorySlug, exclude: p.id, limit: 4 }) : [];
  const range = priceRange(p.pricing.tiers);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, sku: p.sku, description: p.summary || p.name, image: gallery.slice(0, 4),
    ...(p.categoryName ? { category: p.categoryName } : {}), brand: { "@type": "Brand", name: site.brand },
    ...(range ? { offers: { "@type": "AggregateOffer", priceCurrency: site.currency, lowPrice: range.min, highPrice: range.max, offerCount: p.pricing.tiers.length, availability: "https://schema.org/InStock", url: abs(`/products/${p.slug}`), itemCondition: "https://schema.org/NewCondition", seller: { "@id": `${baseUrl()}/#org` }, shippingDetails: shippingLd() } } : {}),
    url: abs(`/products/${p.slug}`), ...(p.material ? { material: p.material } : {}),
  };
  const points = [[IconLayers, t.home.promise[0].t], [IconTag, t.home.promise[1].t], [IconBrush, t.home.promise[2].t], [IconTruck, t.home.promise[3].t]] as const;
  const specs: [string, string][] = [
    [t.product.sku, p.sku],
    [t.product.material, p.material],
    [t.product.size, p.sizeText],
    [t.product.leadDays, `${p.leadDays} ${t.product.days}`],
    [t.product.weight, p.unitWeightG ? `${fmtNum(p.unitWeightG)} g` : ""],
    [t.product.packing, p.cartonQty ? t.product.packingValue(p.cartonQty, p.cartonLengthCm, p.cartonWidthCm, p.cartonHeightCm, p.cartonWeightKg) : ""],
  ];
  return (
    <>
    <div id="top" className="container-x pt-6 pb-14">
      <nav className="mb-6 text-xs text-mute">
        <Link href="/products" className="hover:text-ink">{t.nav.products}</Link>
        {p.categoryName && <> / <Link href={`/products?category=${encodeURIComponent(p.categorySlug ?? "")}`} className="hover:text-ink">{p.categoryName}</Link></>}
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,460px)]">
        <div className="min-w-0">
          <div className="lg:sticky lg:top-32">
            <Gallery images={gallery} alt={p.name} />
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-[26px] leading-[1.2] md:text-[30px]">{p.name}</h1>
          {range && <div className="mt-3 flex items-baseline gap-2"><span className="text-[19px] font-medium">{fmtMoney(range.min)}</span><span className="text-[13px] text-mute">{t.products.from}・{t.product.perPiece}</span></div>}
          <ul className="mt-4 list-disc space-y-1 pl-5 text-[12.5px] text-mute">
            {p.summary && <li>{p.summary}</li>}
            {p.material && <li>{t.product.material}：{p.material}</li>}
            {p.methods.length > 0 && <li>{t.product.method}：{p.methods.map((m) => m.name).join("、")}</li>}
            <li>{t.product.leadDays}：{p.leadDays} {t.product.days}</li>
          </ul>
          <div className="mt-6">
            <Configurator
              p={{
                id: p.id, slug: p.slug, sku: p.sku, name: p.name, image: p.images[0] ?? null, colors: p.colors, sizes: p.sizes, pricing: p.pricing,
                fullPrint: p.colors.length <= 1 && p.positions.length > 0 && p.methods.some((m) => m.code === "transfer" || m.code === "sublimation"),
                positions: p.positions.map((x) => ({ code: x.code, name: x.name, areas: x.areas.map((a) => ({ code: a.code, name: a.name })) })),
                ship: { unitWeightG: p.unitWeightG, cartonQty: p.cartonQty, cartonLengthCm: p.cartonLengthCm, cartonWidthCm: p.cartonWidthCm, cartonHeightCm: p.cartonHeightCm, cartonWeightKg: p.cartonWeightKg },
                zones,
              }}
            />
          </div>
        </div>
      </div>
    </div>

    {/* 保證條 */}
    <section className="container-x">
      <div className="grid overflow-hidden rounded-[14px] border border-line bg-white sm:grid-cols-2 lg:grid-cols-4">
        {t.product.brief.map((x, i) => {
          const Icon = points[i][0];
          return (
            <div key={x.t} className="flex gap-3 border-line p-5 max-lg:border-b lg:border-r lg:last:border-r-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line"><Icon className="h-[18px] w-[18px]" /></span>
              <div>
                <div className="text-[13px] font-bold tracking-tight">{x.t}</div>
                <p className="mt-1 text-[12px] leading-relaxed text-mute">{x.d}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>

    {/* 商品說明與規格 */}
    <section className="container-x grid gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <div className="eyebrow">{t.product.desc}</div>
        <h2 className="mt-3 mb-7 text-[26px] md:text-[30px]">{p.name}</h2>
        <RichDescription text={p.description} />
      </div>
      <div>
        <div className="eyebrow">{t.product.specs}</div>
        <dl className="mt-5 divide-y divide-line rounded-[14px] border border-line bg-white px-5 text-[13px]">
          {specs.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex gap-5 py-3.5">
              <dt className="w-20 shrink-0 text-mute">{k}</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>

    <MethodStrip eyebrow={t.product.methodsEyebrow} title={t.product.methodsTitle} more={t.product.methodsAll} href="/guide#methods" items={t.home.methods} />

    {/* 流程 */}
    <section className="bg-sand">
      <div className="container-x pb-16">
        <div className="flex items-end justify-between gap-4 border-t border-ink/10 pt-14">
          <div>
            <div className="eyebrow">{t.product.orderEyebrow}</div>
            <h2 className="mt-3 text-[26px] md:text-[32px]">{t.product.orderTitle}</h2>
          </div>
          <Link href="/guide" className="shrink-0 text-xs font-semibold underline underline-offset-4">{t.product.orderAll}</Link>
        </div>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {t.product.orderSteps.map((x, i) => (
            <li key={x.t}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
              <div className="mt-4 text-[14px] font-bold tracking-tight">{x.t}</div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-mute">{x.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>

    {/* 注意事項 */}
    <section className="bg-sand">
      <div className="container-x pb-16">
        <div className="eyebrow">{t.product.notesEyebrow}</div>
        <h2 className="mt-3 text-[26px] md:text-[32px]">{t.product.notesTitle}</h2>
        <div className="mt-8 grid overflow-hidden rounded-[14px] bg-white md:grid-cols-3">
          {t.product.notes.map((x) => (
            <div key={x.t} className="border-line p-7 max-md:border-b md:border-r md:last:border-r-0">
              <div className="text-[14px] font-bold tracking-tight">{x.t}</div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-mute">{x.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {related.length > 0 && (
      <section className="bg-sand">
        <div className="container-x pb-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow">{t.products.relatedEyebrow}</div>
              <h2 className="mt-3 text-[26px] md:text-[32px]">{t.products.related}</h2>
            </div>
            {p.categorySlug && <Link href={`/products?category=${encodeURIComponent(p.categorySlug)}`} className="shrink-0 text-xs font-semibold underline underline-offset-4">{t.home.viewAll}</Link>}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-2.5 md:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </div>
      </section>
    )}

    <Faq eyebrow={t.product.faqEyebrow} title={t.product.faqTitle} cta={t.home.faqCta} href="#top" items={t.product.faq} />
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd([[t.blog.home, "/"], [t.nav.products, "/products"], ...(p.categoryName && p.categorySlug ? [[p.categoryName, `/products?category=${encodeURIComponent(p.categorySlug)}`] as [string, string]] : []), [p.name, `/products/${p.slug}`]])} />
      <JsonLd data={faqLd(t.product.faq)} />
      <div className="h-20 bg-[#111] lg:hidden" />
    </>
  );
}
