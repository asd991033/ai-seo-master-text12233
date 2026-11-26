import type { Metadata } from "next";
import { initMarket } from "@/market/server";
import { t } from "@/i18n";
import { site } from "@/config/site";
import { telE164, alts, breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";

export async function generateMetadata(): Promise<Metadata> {
  await initMarket();
  return { title: t.about.title, description: t.about.metaDesc, alternates: alts("/about") };
}

/** 關於我們：海外站的公司地址只在這一頁顯示（頁尾與其他頁面不顯示） */
export default async function AboutPage() {
  const en = (await initMarket()).locale === "en";
  const a = t.about;
  return (
    <div className="container-x py-12 md:py-16">
      <JsonLd data={breadcrumbLd([[t.blog.home, "/"], [a.title, "/about"]])} />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-[34px] md:text-[44px]">{a.title}</h1>
        <p className="mt-4 leading-relaxed text-mute">{a.lead}</p>
        {a.sections.map((s) => (
          <section key={s.h} className="mt-10">
            <h2 className="text-[20px] font-bold md:text-[22px]">{s.h}</h2>
            {s.p.map((x) => <p key={x} className="mt-3 leading-[1.9]">{x}</p>)}
          </section>
        ))}
        <section className="mt-10">
          <h2 className="text-[20px] font-bold md:text-[22px]">{a.companyTitle}</h2>
          <address className="card mt-4 space-y-2 p-5 leading-relaxed not-italic" data-testid="company-info">
            <div><span className="text-mute">{a.brandLabel}　</span>{site.brand}</div>
            <div><span className="text-mute">{t.footer.address}　</span>{en ? site.address.fullEn : site.address.full}</div>
            <div><span className="text-mute">{t.footer.email}　</span><a href={`mailto:${site.contactEmail}`} className="underline underline-offset-4">{site.contactEmail}</a></div>
            {!en && <div><span className="text-mute">{t.footer.phone}　</span><a href={`tel:${telE164(site.contactPhone).replace(/[^0-9+]/g, "")}`} className="underline underline-offset-4">{site.contactPhone}</a></div>}
          </address>
          <p className="mt-4 text-sm text-mute">{a.contactNote}</p>
        </section>
      </div>
    </div>
  );
}
