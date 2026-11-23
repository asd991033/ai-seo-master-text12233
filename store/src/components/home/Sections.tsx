import Link from "next/link";

/** 黑底常見問題區（首頁與商品頁共用） */
export function Faq({ eyebrow, title, cta, href, items }: { eyebrow: string; title: string; cta: string; href: string; items: { q: string; a: string }[] }) {
  return (
    <section className="bg-[#111] text-white">
      <div className="container-x grid gap-10 py-20 md:grid-cols-[1fr_1.6fr]">
        <div>
          <div className="text-[11px] font-medium tracking-[0.22em] text-white/50 uppercase">{eyebrow}</div>
          <h2 className="mt-4 text-[30px] leading-tight md:text-[34px]">{title}</h2>
          <Link href={href} className="mt-6 inline-flex rounded-[14px] bg-white px-5 py-2.5 text-sm font-medium text-ink hover:bg-white/85">{cta}</Link>
        </div>
        <div>
          {items.map((f, i) => (
            <details key={f.q} className="km-faq border-b border-white/15 py-5" open={i === 0}>
              <summary className="flex items-center justify-between gap-6 text-[15px] font-semibold">
                {f.q}
                <span className="km-plus shrink-0 text-xl leading-none font-light transition">＋</span>
              </summary>
              <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-white/65">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 印刷方式橫向列 */
export function MethodStrip({ eyebrow, title, more, href, items }: { eyebrow: string; title: string; more: string; href: string; items: { t: string; d: string; img: string }[] }) {
  return (
    <section className="bg-sand">
      <div className="container-x py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="mt-3 text-[26px] md:text-[32px]">{title}</h2>
          </div>
          <Link href={href} className="shrink-0 text-xs font-semibold underline underline-offset-4">{more}</Link>
        </div>
        <div className="km-scroll mt-8 -mr-4 pr-4 sm:-mr-8 sm:pr-8">
          {items.map((m) => (
            <div key={m.t} className="w-[150px] sm:w-[178px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.img} alt={m.t} loading="lazy" className="aspect-square w-full rounded-[12px] object-cover" />
              <div className="mt-3 text-[13px] font-semibold">{m.t}</div>
              <div className="mt-0.5 text-[11px] text-gold">{m.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
