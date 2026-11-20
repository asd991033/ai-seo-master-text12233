import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t.guide.title };

export default async function GuidePage() {
  const methods = await db.select().from(schema.printMethods).orderBy(asc(schema.printMethods.sort));
  return (
    <div className="container-x max-w-4xl py-12">
      <h1 className="text-3xl font-bold">{t.guide.title}</h1>
      <ol className="mt-10 grid gap-4 sm:grid-cols-2">
        {t.home.steps.map((s, i) => (
          <li key={s.t} className="card p-5">
            <div className="serif text-2xl font-bold text-gold">0{i + 1}</div>
            <div className="mt-2 font-bold">{s.t}</div>
            <p className="mt-1 text-sm leading-relaxed text-mute">{s.d}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-14 text-xl font-bold">{t.guide.methodsTitle}</h2>
      <div className="card mt-4 divide-y divide-line">
        {methods.map((m) => (
          <div key={m.id} className="grid gap-1 p-4 text-sm sm:grid-cols-[180px_1fr]">
            <div className="font-medium">{m.name}{m.perColor && <span className="ml-2 text-xs text-gold">1–{m.maxColors} {t.product.colorsUnit}</span>}</div>
            <div className="text-mute">{m.description}</div>
          </div>
        ))}
      </div>

      {[[t.guide.fileTitle, t.guide.fileRules], [t.guide.shipTitle, t.guide.shipRules]].map(([title, rules]) => (
        <section key={title as string}>
          <h2 className="mt-14 text-xl font-bold">{title}</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-mute">
            {(rules as string[]).map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>
      ))}

      <h2 className="mt-14 text-xl font-bold">{t.guide.faqTitle}</h2>
      <div className="mt-4 space-y-3">
        {t.guide.faq.map((f) => (
          <details key={f.q} className="card p-4 text-sm">
            <summary className="cursor-pointer font-medium">{f.q}</summary>
            <p className="mt-2 leading-relaxed text-mute">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
