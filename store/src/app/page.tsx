import Link from "next/link";
import { t } from "@/i18n";
import { listCategories, listProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featured, cats] = await Promise.all([listProducts({ limit: 8 }), listCategories()]);
  return (
    <>
      <section className="border-b border-line bg-sand">
        <div className="container-x grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="eyebrow">{t.home.eyebrow}</div>
            <h1 className="mt-4 text-4xl leading-tight font-bold text-forest md:text-5xl">{t.home.title}</h1>
            <p className="mt-5 max-w-md leading-relaxed text-mute">{t.home.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary">{t.home.ctaShop}</Link>
              <Link href="/guide" className="btn-outline">{t.home.ctaGuide}</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {featured.slice(0, 4).map((p, i) => (
              <Link key={p.id} href={`/products/${p.slug}`} className={`card overflow-hidden ${i % 2 ? "translate-y-6" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.images[0] && <img src={p.images[0]} alt={p.name} className="aspect-square w-full object-cover" />}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {t.home.promise.map((x) => (
          <div key={x.t} className="border-l-2 border-gold pl-4">
            <div className="font-bold">{x.t}</div>
            <div className="mt-1 text-sm text-mute">{x.d}</div>
          </div>
        ))}
      </section>

      <section className="container-x py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">{t.home.categories}</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {cats.map((c) => (
            <Link key={c.id} href={`/products?category=${encodeURIComponent(c.slug)}`} className="chip px-5 py-2.5">{c.name}</Link>
          ))}
        </div>
      </section>

      <section className="container-x py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">{t.home.featured}</h2>
          <Link href="/products" className="text-sm text-forest hover:underline">{t.home.viewAll} →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="container-x py-14">
        <h2 className="text-center text-2xl font-bold">{t.home.stepsTitle}</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {t.home.steps.map((s, i) => (
            <li key={s.t} className="card p-6">
              <div className="serif text-3xl font-bold text-gold">0{i + 1}</div>
              <div className="mt-3 font-bold">{s.t}</div>
              <p className="mt-2 text-sm leading-relaxed text-mute">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
