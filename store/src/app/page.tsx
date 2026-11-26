import Link from "@/components/Link";
import { term } from "@/i18n/terms";
import { initMarket } from "@/market/server";
import type { Metadata } from "next";
import { alts, faqLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { PostCard } from "@/components/PostCard";
import { listPosts } from "@/lib/blog";
import { t } from "@/i18n";
import { site } from "@/config/site";
import { categoryCounts, listProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { Faq, MethodStrip } from "@/components/home/Sections";
import { IconBrush, IconLayers, IconTag, IconTruck } from "@/components/Icons";

export const dynamic = "force-dynamic";

const USP_ICONS = [IconLayers, IconBrush, IconTruck, IconTag];
const pill = "inline-flex items-center gap-2 rounded-[14px] px-5 py-3 text-sm font-medium transition";

export async function generateMetadata(): Promise<Metadata> {
  await initMarket();
  return { description: t.home.lead, alternates: alts("/"), openGraph: { title: `${site.brand}｜${t.home.eyebrow}`, description: t.home.lead, type: "website", images: ["/eg/hero-2.jpg"] } };
}

export default async function Home() {
  const m = await initMarket();
  const [featured, cats, posts] = await Promise.all([listProducts({ limit: 8 }), categoryCounts(), listPosts(3)]);
  const slugOf = (name: string) => cats.find((c) => c.key === name)?.slug;
  const catHref = (name: string) => (slugOf(name) ? `/products?category=${encodeURIComponent(slugOf(name)!)}` : "/products");
  return (
    <div className="-mt-[70px]">
      {/* 主視覺 */}
      <section className="relative overflow-hidden rounded-b-[22px] bg-sand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* 手機：圖在上、文字在下，深色商品才不會壓在標題後面看不清楚；桌機維持文字疊在圖的左側 */}
        <img src="/eg/hero-2.jpg" alt={t.alt.hero} className="block h-[340px] w-full object-cover object-[72%_60%] md:absolute md:inset-0 md:h-full md:object-center" />
        <div className="container-x relative flex flex-col justify-end pt-7 pb-10 md:min-h-[640px] md:pt-32 md:pb-16">
          <h1 className="max-w-[560px] text-[38px] leading-[1.12] md:text-[52px]">{t.home.title}</h1>
          <p className="mt-4 max-w-[400px] text-[15px] leading-relaxed">{t.home.lead}</p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link href="/products" className={`${pill} bg-ink text-white hover:bg-black`}>{t.home.ctaShop} <span aria-hidden>→</span></Link>
            <Link href="/guide" className={`${pill} bg-white text-ink hover:bg-white/80`}>{t.home.ctaGuide} <span aria-hidden>→</span></Link>
          </div>
        </div>
      </section>

      <MethodStrip eyebrow={t.home.methodsEyebrow} title={t.home.methodsTitle} more={t.home.methodsAll} href="/guide#methods" items={t.home.methods} />

      {/* 優勢 */}
      <section className="container-x py-16">
        <div className="eyebrow">{t.home.uspEyebrow}</div>
        <h2 className="mt-3 text-[26px] md:text-[32px]">{t.home.uspTitle(site.brand)}</h2>
        <div className="mt-8 grid overflow-hidden rounded-[14px] border border-line sm:grid-cols-2 lg:grid-cols-4">
          {t.home.usp.map((u, i) => {
            const Icon = USP_ICONS[i];
            return (
              <div key={u.t} className="relative border-line p-7 max-lg:border-b lg:border-r lg:last:border-r-0">
                <span className="absolute top-6 right-6 text-[10px] tracking-widest text-gold">0{i + 1}</span>
                <Icon className="h-7 w-7" />
                <div className="mt-6 text-[17px] font-bold tracking-tight">{u.t}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-mute">{u.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 跑馬燈 */}
      <section className="overflow-hidden py-6" aria-hidden>
        <div className="-mx-6 -rotate-[1.2deg] bg-[#111] py-4 text-white">
          <div className="km-marquee">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center">
                {[...t.home.ticker, ...t.home.ticker].map((x, i) => (
                  <span key={i} className="flex items-center gap-10 pr-10 text-[11px] font-semibold tracking-[0.26em] whitespace-nowrap uppercase">{x}<i className="not-italic opacity-60">◇</i></span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 品類拼貼 */}
      <section className="container-x grid gap-8 py-16 lg:grid-cols-[320px_1fr]">
        <div>
          <div className="eyebrow">{t.home.catEyebrow}</div>
          <h2 className="mt-3 text-[26px] leading-tight md:text-[32px]">{t.home.catTitle}</h2>
          <p className="mt-4 text-[13px] leading-relaxed text-mute">{t.home.catLead}</p>
          <Link href="/products" className={`${pill} mt-6 bg-ink text-white hover:bg-black`}>{t.home.catAll} <span aria-hidden>→</span></Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:grid-rows-2">
          <Tile href="/products" img="/eg/cat-all.jpg" title={t.home.catAllTitle} desc={t.home.catAllDesc} className="col-span-2 md:col-span-1 md:row-span-2" />
          {t.home.catTiles.map((c) => <Tile key={c.cat} href={catHref(c.cat)} img={c.img} title={term(c.cat, m.locale)} desc={c.d} />)}
        </div>
      </section>

      {/* 流程 */}
      <section className="bg-sand">
        <div className="container-x py-16">
          <div className="eyebrow">{t.home.stepsEyebrow}</div>
          <h2 className="mt-3 text-[26px] md:text-[32px]">{t.home.stepsTitle}</h2>
          <ol className="mt-8 grid grid-cols-2 gap-2.5 md:grid-cols-5">
            {t.home.steps.map((s, i) => (
              <li key={s.t} className="rounded-[14px] bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/eg/step-${i + 1}.jpg`} alt={`${t.home.stepsTitle}：${s.t}`} loading="lazy" className="aspect-[4/3.1] w-full rounded-[10px] object-cover" />
                <div className="px-2 pt-4 pb-3">
                  <div className="flex items-center justify-between text-[11px] text-gold"><span>0{i + 1}</span><span aria-hidden>→</span></div>
                  <div className="mt-3 text-[14px] font-bold tracking-tight">{s.t}</div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-mute">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 黑色橫幅 */}
      <section className="relative overflow-hidden bg-[#111] text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/eg/banner.jpg" alt={t.alt.banner} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="container-x relative py-24">
          <div className="text-[11px] font-medium tracking-[0.22em] text-white/60 uppercase">{t.home.bannerEyebrow}</div>
          <h2 className="mt-4 text-[30px] md:text-[38px]">{t.home.bannerTitle}</h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-white/75">{t.home.bannerLead}</p>
          <Link href="/products" className={`${pill} mt-7 bg-white text-ink hover:bg-white/85`}>{t.home.bannerCta}</Link>
        </div>
      </section>

      {/* 精選商品 */}
      <section className="container-x grid gap-8 py-16 lg:grid-cols-[320px_1fr]">
        <div className="lg:pt-24">
          <div className="eyebrow">{t.home.featuredEyebrow}</div>
          <h2 className="mt-3 text-[26px] leading-tight md:text-[32px]">{t.home.featured}</h2>
          <p className="mt-4 text-[13px] leading-relaxed text-mute">{t.home.featuredLead}</p>
          <Link href="/products" className="mt-5 inline-block text-xs font-semibold underline underline-offset-4">{t.home.featuredCta} →</Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">{featured.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      {/* 送禮場合 */}
      <section className="grid border-y border-line md:grid-cols-[1fr_1.1fr]">
        <div className="relative min-h-[320px] overflow-hidden bg-[#111] text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/eg/hero-3.jpg" alt={t.alt.occasions} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-55 grayscale" />
          <div className="relative flex h-full flex-col justify-end p-8 sm:p-12">
            <div className="text-[11px] font-medium tracking-[0.22em] text-white/60 uppercase">{t.home.useEyebrow}</div>
            <h2 className="mt-3 text-[28px] md:text-[34px]">{t.home.useTitle}</h2>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-white/75">{t.home.useLead}</p>
            <div><Link href="/products" className={`${pill} mt-6 bg-white text-ink hover:bg-white/85`}>{t.home.useCta}</Link></div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2">
          {t.home.uses.map((u) => (
            <Link key={u.t} href="/products" className="group border-line p-8 transition hover:bg-sand/60 max-sm:border-b sm:odd:border-r sm:[&:nth-child(-n+2)]:border-b">
              <div className="flex items-center justify-between text-[15px] font-bold tracking-tight">{u.t}<span aria-hidden className="text-gold transition group-hover:translate-x-1">→</span></div>
              <p className="mt-3 text-[13px] leading-relaxed text-mute">{u.d}</p>
            </Link>
          ))}
        </div>
      </section>

      {posts.length > 0 && (
        <section className="container-x py-16">
          <div className="flex items-end justify-between gap-4">
            <div><div className="eyebrow">{t.blog.eyebrow}</div><h2 className="mt-3 text-[26px] md:text-[32px]">{t.blog.latest}</h2></div>
            <Link href="/blog" className="shrink-0 text-xs font-semibold underline underline-offset-4">{t.blog.viewAll}</Link>
          </div>
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <PostCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <Faq eyebrow={t.home.faqEyebrow} title={t.home.faqTitle} cta={t.home.faqCta} href="/products" items={t.home.faq} />
      <JsonLd data={faqLd(t.home.faq)} />
    </div>
  );
}

function Tile({ href, img, title, desc, className = "" }: { href: string; img: string; title: string; desc: string; className?: string }) {
  return (
    <Link href={href} className={`group relative block min-h-[190px] overflow-hidden rounded-[14px] bg-[#111] text-white ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt={`${title}｜${t.alt.category}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <div>
          <div className="text-[16px] font-bold tracking-tight">{title}</div>
          <div className="mt-1 text-[11px] leading-snug text-white/80">{desc}</div>
        </div>
        <span aria-hidden className="shrink-0 pb-0.5">→</span>
      </div>
    </Link>
  );
}
