import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { fmtNum } from "@/lib/format";
import { getProductBySlug, listZones } from "@/lib/catalog";
import { Configurator } from "@/components/Configurator";
import { Gallery } from "@/components/Gallery";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  return p ? { title: p.name, description: p.summary } : {};
}

export default async function ProductPage({ params }: Props) {
  const [p, zones] = await Promise.all([getProductBySlug((await params).slug), listZones()]);
  if (!p) notFound();
  const specs: [string, string][] = [
    [t.product.sku, p.sku],
    [t.product.material, p.material],
    [t.product.size, p.sizeText],
    [t.product.leadDays, `${p.leadDays} ${t.product.days}`],
    [t.product.weight, p.unitWeightG ? `${fmtNum(p.unitWeightG)} g` : ""],
    [t.product.packing, p.cartonQty ? t.product.packingValue(p.cartonQty, p.cartonLengthCm, p.cartonWidthCm, p.cartonHeightCm, p.cartonWeightKg) : ""],
  ];
  return (
    <div className="container-x py-8">
      <nav className="mb-6 text-xs text-mute">
        <Link href="/products" className="hover:text-ink">{t.nav.products}</Link>
        {p.categoryName && <> / <Link href={`/products?category=${encodeURIComponent(p.categorySlug ?? "")}`} className="hover:text-ink">{p.categoryName}</Link></>}
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,460px)]">
        <div>
          <div className="lg:sticky lg:top-24">
            <Gallery images={p.images} alt={p.name} />
          </div>
        </div>
        <div>
          <h1 className="text-3xl leading-snug font-bold">{p.name}</h1>
          <p className="mt-3 leading-relaxed text-mute">{p.summary}</p>
          <div className="mt-6">
            <Configurator
              p={{
                id: p.id, slug: p.slug, sku: p.sku, name: p.name, image: p.images[0] ?? null, colors: p.colors, pricing: p.pricing,
                positions: p.positions.map((x) => ({ code: x.code, name: x.name, areas: x.areas.map((a) => ({ code: a.code, name: a.name })) })),
                ship: { unitWeightG: p.unitWeightG, cartonQty: p.cartonQty, cartonLengthCm: p.cartonLengthCm, cartonWidthCm: p.cartonWidthCm, cartonHeightCm: p.cartonHeightCm, cartonWeightKg: p.cartonWeightKg },
                zones,
              }}
            />
          </div>
        </div>
      </div>
      <section className="mt-14 grid gap-10 border-t border-line pt-10 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold">{t.product.desc}</h2>
          <p className="mt-4 leading-loose whitespace-pre-line text-mute">{p.description}</p>
        </div>
        <dl className="divide-y divide-line text-sm">
          {specs.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex gap-6 py-3">
              <dt className="w-24 shrink-0 text-mute">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
