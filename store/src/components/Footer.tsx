import Link from "next/link";
import { site } from "@/config/site";
import { t } from "@/i18n";
import { categoryCounts } from "@/lib/catalog";

export async function Footer() {
  const cats = (await categoryCounts()).filter((c) => c.count > 0).slice(0, 5);
  const head = "mb-4 text-[10px] font-medium tracking-[0.22em] text-gold uppercase";
  return (
    <footer className="no-print bg-sand">
      <div className="container-x grid gap-10 py-16 text-[13px] md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <div className="text-[22px] leading-none font-extrabold tracking-[-0.03em] uppercase">{site.brand}</div>
          <p className="mt-4 max-w-[260px] leading-relaxed text-mute">{t.footer.about}</p>
          <div className={`mt-6 ${head} !mb-1.5`}>{t.footer.email}</div>
          <a href={`mailto:${site.contactEmail}`} className="hover:underline">{site.contactEmail}</a>
          <div>
            <a href={`mailto:${site.contactEmail}`} className="mt-6 inline-flex rounded-[12px] border border-ink/15 bg-white px-4 py-2 text-xs font-medium hover:border-ink">{t.footer.contactCta}</a>
          </div>
        </div>
        <div>
          <div className={head}>{t.footer.shop}</div>
          <ul className="space-y-3">
            {cats.map((c) => <li key={c.id}><Link href={`/products?category=${encodeURIComponent(c.slug)}`} className="text-mute hover:text-ink">{c.name}</Link></li>)}
            <li><Link href="/products" className="text-mute hover:text-ink">{t.nav.products}</Link></li>
          </ul>
        </div>
        <div>
          <div className={head}>{t.footer.learn}</div>
          <ul className="space-y-3">
            <li><Link href="/guide#methods" className="text-mute hover:text-ink">{t.nav.methods}</Link></li>
            <li><Link href="/guide" className="text-mute hover:text-ink">{t.nav.guide}</Link></li>
            <li><Link href="/guide#files" className="text-mute hover:text-ink">{t.guide.fileTitle}</Link></li>
            <li><Link href="/guide#shipping" className="text-mute hover:text-ink">{t.guide.shipTitle}</Link></li>
          </ul>
        </div>
        <div>
          <div className={head}>{t.footer.help}</div>
          <ul className="space-y-3">
            <li><Link href="/guide#faq" className="text-mute hover:text-ink">{t.nav.faq}</Link></li>
            <li><Link href="/account" className="text-mute hover:text-ink">{t.nav.account}</Link></li>
            <li><Link href="/cart" className="text-mute hover:text-ink">{t.nav.cart}</Link></li>
            <li><a href={`mailto:${site.contactEmail}`} className="text-mute hover:text-ink">{t.nav.contact}</a></li>
          </ul>
        </div>
      </div>
      <div className="container-x border-t border-ink/10 py-6 text-[11px] text-gold">© {new Date().getFullYear()} {site.brand}. {t.footer.rights}</div>
    </footer>
  );
}
