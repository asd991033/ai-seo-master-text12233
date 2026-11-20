import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { fmtNum } from "@/lib/format";
import { getProductBySlug, listProducts, listZones } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
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
  return p ? { title: p.name, description: p.summary || p.name, openGraph: { title: p.name, description: p.summary, images: p.images.slice(0, 1) } } : {};
}

export default async function ProductPage({ params }: Props) {
  const [p, zones] = await Promise.all([getProductBySlug((await params).slug), listZones()]);
  if (!p) notFound();
  const related = p.categorySlug ? await listProducts({ category: p.categorySlug, exclude: p.id, limit: 4 }) : [];
  const range = priceRange(p.pricing.tiers);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, sku: p.sku, description: p.summary || p.name, image: p.images.slice(0, 4),
    ...(p.categoryName ? { category: p.categoryName } : {}), brand: { "@type": "Brand", name: site.brand },
    ...(range ? { offers: { "@type": "AggregateOffer", priceCurrency: site.currency, lowPrice: range.min, highPrice: range.max, offerCount: p.pricing.tiers.length, availability: "https://schema.org/InStock" } } : {}),
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
    <div className="container-x py-8 pb-28 lg:pb-8">
      <nav className="mb-6 text-xs text-mute">
        <Link href="/products" className="hover:text-ink">{t.nav.products}</Link>
        {p.categoryName && <> / <Link href={`/products?category=${encodeURIComponent(p.categorySlug ?? "")}`} className="hover:text-ink">{p.categoryName}</Link></>}
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,460px)]">
        <div className="min-w-0">
          <div className="lg:sticky lg:top-32">
            <Gallery images={p.images} alt={p.name} />
          </div>
        </div>
        <div className="min-w-0">
          {p.categoryName && <div className="eyebrow">{p.categoryName}</div>}
          <h1 className="mt-2 text-3xl leading-snug font-bold md:text-[34px]">{p.name}</h1>
          <p className="mt-3 leading-relaxed text-mute">{p.summary}</p>
          {range && <div className="mt-4 flex items-baseline gap-2"><span className="serif text-3xl font-bold text-forest">{fmtMoney(range.min)}</span><span className="text-sm text-mute">{t.products.from}・{t.product.perPiece}</span></div>}
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5 border-y border-line py-4 text-[13px] text-mute">
            {points.map(([Icon, label]) => <li key={label} className="flex items-center gap-2"><Icon className="h-[18px] w-[18px] text-forest" />{label}</li>)}
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
      <section className="mt-16 grid gap-12 border-t border-line pt-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <h2 className="mb-6 text-2xl font-bold">{t.product.desc}</h2>
          <RichDescription text={p.description} />
        </div>
        <div>
          <h2 className="mb-6 text-2xl font-bold">{t.product.specs}</h2>
          <dl className="divide-y divide-line rounded-2xl border border-line bg-white px-5 text-sm">
            {specs.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex gap-5 py-3.5">
                <dt className="w-20 shrink-0 text-mute">{k}</dt>
                <dd className="min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      {related.length > 0 && (
        <section className="mt-16 border-t border-line pt-12">
          <h2 className="mb-8 text-2xl font-bold">{t.products.related}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
