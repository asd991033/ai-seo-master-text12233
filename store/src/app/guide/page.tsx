import type { Metadata } from "next";
import { term } from "@/i18n/terms";
import { initMarket } from "@/market/server";
import { JsonLd } from "@/components/JsonLd";
import { alts, breadcrumbLd, faqLd } from "@/lib/seo";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  await initMarket();
  return { title: t.guide.title, description: t.guide.metaDesc, alternates: alts("/guide") };
}

export default async function GuidePage() {
  const mkt = await initMarket();
  const methods = (await db.select().from(schema.printMethods).orderBy(asc(schema.printMethods.sort))).map((x) => ({ ...x, name: term(x.name, mkt.locale), description: term(x.description, mkt.locale) }));
  return (
    <>
    <section className="relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/eg/banner.jpg" alt={t.alt.banner} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/45 to-transparent" />
      <div className="container-x relative py-20 text-white md:py-28">
        <div className="text-xs tracking-[0.2em] text-[#e9d9b5]">{t.nav.guide.toUpperCase()}</div>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">{t.guide.title}</h1>
        <p className="mt-4 max-w-md leading-relaxed text-white/85">{t.guide.lead}</p>
      </div>
    </section>
    <div className="container-x max-w-4xl py-12">
      <ol className="mt-10 grid gap-4 sm:grid-cols-2">
        {t.home.steps.map((s, i) => (
          <li key={s.t} className="card p-5">
            <div className="serif text-2xl font-bold text-gold">0{i + 1}</div>
            <div className="mt-2 font-bold">{s.t}</div>
            <p className="mt-1 text-sm leading-relaxed text-mute">{s.d}</p>
          </li>
        ))}
      </ol>

      <h2 id="methods" className="mt-14 scroll-mt-28 text-xl font-bold">{t.guide.methodsTitle}</h2>
      <div className="card mt-4 divide-y divide-line">
        {methods.map((m) => (
          <div key={m.id} className="grid gap-1 p-4 text-sm sm:grid-cols-[180px_1fr]">
            <div className="font-medium">{m.name}{m.perColor && <span className="ml-2 text-xs text-gold">1–{m.maxColors} {t.product.colorsUnit}</span>}</div>
            <div className="text-mute">{m.description}</div>
          </div>
        ))}
      </div>

      {[[t.guide.fileTitle, t.guide.fileRules], [t.guide.shipTitle, t.guide.shipRules]].map(([title, rules]) => (
        <section key={title as string} id={title === t.guide.fileTitle ? "files" : "shipping"} className="scroll-mt-32">
          <h2 className="mt-14 text-xl font-bold">{title}</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-mute">
            {(rules as string[]).map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>
      ))}

      <JsonLd data={faqLd(t.guide.faq)} />
      <JsonLd data={breadcrumbLd([[t.blog.home, "/"], [t.guide.title, "/guide"]])} />
      <h2 id="faq" className="mt-14 scroll-mt-32 text-xl font-bold">{t.guide.faqTitle}</h2>
      <div className="mt-4 space-y-3">
        {t.guide.faq.map((f) => (
          <details key={f.q} className="card p-4 text-sm">
            <summary className="cursor-pointer font-medium">{f.q}</summary>
            <p className="mt-2 leading-relaxed text-mute">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
    </>
  );
}
