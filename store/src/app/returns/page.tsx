import type { Metadata } from "next";
import { t } from "@/i18n";
import { site } from "@/config/site";
import { breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = { title: t.returns.title, description: t.returns.metaDesc, alternates: { canonical: "/returns" } };

/** 政策最後修訂日（內容有改就更新這裡） */
const UPDATED = "2026-11-23";

export default function ReturnsPage() {
  const r = t.returns;
  return (
    <div className="container-x py-12 md:py-16">
      <JsonLd data={breadcrumbLd([[t.blog.home, "/"], [r.title, "/returns"]])} />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-[34px] md:text-[44px]">{r.title}</h1>
        <p className="mt-4 leading-relaxed text-mute">{r.lead}</p>
        <p className="mt-2 text-xs text-mute">{r.updated}：<time dateTime={UPDATED}>{UPDATED.replace(/-/g, "/")}</time></p>
        {r.sections.map((s) => (
          <section key={s.h} className="mt-10">
            <h2 className="text-[20px] font-bold md:text-[22px]">{s.h}</h2>
            {s.p.map((x) => <p key={x} className="mt-3 leading-[1.9]">{x}</p>)}
            {"list" in s && s.list && <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">{s.list.map((x) => <li key={x}>{x}</li>)}</ul>}
            {s.h.includes("聯絡") && (
              <address className="mt-3 space-y-1.5 leading-relaxed not-italic">
                <div>{t.footer.phone}：<a href={`tel:${site.contactPhone.replace(/[^0-9+]/g, "")}`} className="underline underline-offset-4">{site.contactPhone}</a></div>
                <div>{t.footer.email}：<a href={`mailto:${site.contactEmail}`} className="underline underline-offset-4">{site.contactEmail}</a></div>
                <div>{t.footer.address}：{site.address.full}</div>
              </address>
            )}
          </section>
        ))}
        <p className="mt-12 border-t border-line pt-6 text-xs leading-relaxed text-mute">{r.note}</p>
      </div>
    </div>
  );
}
