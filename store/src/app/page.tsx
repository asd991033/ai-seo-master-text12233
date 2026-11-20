import Link from "next/link";
import { t } from "@/i18n";
import { categoryCounts, listProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { IconArrow, IconBrush, IconCheck, IconLayers, IconTag, IconTruck } from "@/components/Icons";

export const dynamic = "force-dynamic";

const PROMISE_ICONS = [IconLayers, IconTag, IconBrush, IconTruck];

export default async function Home() {
  const [featured, cats] = await Promise.all([listProducts({ limit: 8 }), categoryCounts()]);
  const catList = cats.filter((c) => c.count > 0);
  const catSlug = (name: string) => catList.find((c) => c.name === name)?.slug;
  return (
    <>
      {/* 主視覺 */}
      <section className="overflow-hidden bg-sand">
        <div className="container-x grid items-center gap-10 py-14 md:grid-cols-[1.05fr_1fr] md:py-20">
          <div>
            <div className="eyebrow">{t.home.eyebrow}</div>
            <h1 className="mt-5 text-[40px] leading-[1.2] font-bold text-forest md:text-[54px]">{t.home.title}</h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-mute">{t.home.lead}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary px-7 py-3.5 text-base">{t.home.ctaShop}<IconArrow className="h-4 w-4" /></Link>
              <Link href="/guide" className="btn-outline px-7 py-3.5 text-base">{t.home.ctaGuide}</Link>
            </div>
          </div>
          <div className="relative mx-auto grid w-full max-w-lg grid-cols-2 gap-4">
            {/* eslint-disable @next/next/no-img-element */}
            <div className="space-y-4 pt-10">
              <img src="/showcase/backpack.jpg" alt="" className="aspect-square w-full rounded-3xl bg-white object-cover shadow-xl" />
              <img src="/showcase/mousepad.jpg" alt="" className="aspect-[4/3] w-full rounded-3xl bg-white object-cover shadow-xl" />
            </div>
            <div className="space-y-4">
              <img src="/showcase/blanket.jpg" alt="" className="aspect-[4/5] w-full rounded-3xl bg-white object-cover shadow-xl" />
              <img src="/showcase/tote.jpg" alt="" className="aspect-square w-full rounded-3xl bg-white object-cover shadow-xl" />
            </div>
            {/* eslint-enable @next/next/no-img-element */}
            <span className="absolute right-3 bottom-3 rounded-full bg-ink/70 px-3 py-1 text-[11px] text-white">{t.home.sample}</span>
          </div>
        </div>
      </section>

      {/* 四個承諾 */}
      <section className="border-b border-line">
        <div className="container-x grid grid-cols-2 gap-y-8 py-10 lg:grid-cols-4">
          {t.home.promise.map((x, i) => {
            const Icon = PROMISE_ICONS[i];
            return (
              <div key={x.t} className="flex gap-4 px-2">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest/8 text-forest"><Icon /></span>
                <div>
                  <div className="font-bold">{x.t}</div>
                  <div className="mt-1 text-sm leading-relaxed text-mute">{x.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 分類 */}
      <section className="container-x py-16">
        <SectionHead title={t.home.categories} lead={t.home.categoriesLead} />
        <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {catList.slice(0, 8).map((c) => (
            <Link key={c.id} href={`/products?category=${encodeURIComponent(c.slug)}`} className="group relative overflow-hidden rounded-2xl bg-white ring-1 ring-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.image && <img src={c.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />}
              <div className="flex items-baseline justify-between px-4 py-3.5">
                <span className="font-bold group-hover:text-forest">{c.name}</span>
                <span className="text-xs text-mute">{c.count} {t.home.countUnit}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 熱門商品 */}
      <section className="bg-sand/60 py-16">
        <div className="container-x">
          <SectionHead title={t.home.featured} lead={t.home.featuredLead} href="/products" cta={t.home.viewAll} />
          <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </div>
      </section>

      {/* 使用情境 */}
      <section className="container-x py-16">
        <SectionHead title={t.home.scenesTitle} />
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {t.home.scenes.map((s) => (
            <Link key={s.t} href={catSlug(s.cat) ? `/products?category=${encodeURIComponent(catSlug(s.cat)!)}` : "/products"} className="group overflow-hidden rounded-3xl bg-white ring-1 ring-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.img} alt="" loading="lazy" className="aspect-[5/4] w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="p-6">
                <h3 className="text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mute">{s.d}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-forest">{s.cta}<IconArrow className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 排版工具 */}
      <section className="bg-forest text-white">
        <div className="container-x grid items-center gap-10 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-3xl leading-snug font-bold md:text-4xl">{t.home.designerTitle}</h2>
            <p className="mt-5 max-w-md leading-relaxed text-white/75">{t.home.designerLead}</p>
            <ul className="mt-7 space-y-3 text-[15px]">
              {t.home.designerPoints.map((x) => (
                <li key={x} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-gold text-white"><IconCheck className="h-3.5 w-3.5" /></span>{x}</li>
              ))}
            </ul>
            <Link href="/products" className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-medium text-forest transition hover:bg-sand">{t.home.designerCta}<IconArrow className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* eslint-disable @next/next/no-img-element */}
            <img src="/showcase/pillow.jpg" alt="" loading="lazy" className="aspect-square w-full rounded-3xl bg-white object-cover" />
            <img src="/showcase/tee.jpg" alt="" loading="lazy" className="mt-8 aspect-square w-full rounded-3xl bg-white object-cover" />
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </div>
      </section>

      {/* 流程 */}
      <section className="container-x py-16">
        <SectionHead title={t.home.stepsTitle} href="/guide" cta={t.home.ctaGuide} />
        <ol className="mt-9 grid gap-5 md:grid-cols-4">
          {t.home.steps.map((s, i) => (
            <li key={s.t} className="relative rounded-2xl border border-line bg-white p-6">
              <div className="serif text-4xl font-bold text-gold/80">0{i + 1}</div>
              <div className="mt-4 font-bold">{s.t}</div>
              <p className="mt-2 text-sm leading-relaxed text-mute">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 收尾 */}
      <section className="container-x">
        <div className="rounded-3xl bg-sand px-6 py-14 text-center">
          <h2 className="text-3xl font-bold text-forest">{t.home.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-md text-mute">{t.home.ctaLead}</p>
          <Link href="/products" className="btn-primary mt-7 px-8 py-3.5 text-base">{t.home.ctaShop}<IconArrow className="h-4 w-4" /></Link>
        </div>
      </section>
    </>
  );
}

function SectionHead({ title, lead, href, cta }: { title: string; lead?: string; href?: string; cta?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-[28px] font-bold md:text-[32px]">{title}</h2>
        {lead && <p className="mt-2 text-mute">{lead}</p>}
      </div>
      {href && <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:underline">{cta}<IconArrow className="h-4 w-4" /></Link>}
    </div>
  );
}
