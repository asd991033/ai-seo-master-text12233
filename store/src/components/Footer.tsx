import Link from "@/components/Link";
import { site } from "@/config/site";
import { telE164 } from "@/lib/seo";
import { t } from "@/i18n";
import { categoryCounts } from "@/lib/catalog";
import { currentMarket, currentPath } from "@/market/server";
import { localize, marketList } from "@/config/markets";

export async function Footer() {
  const cats = (await categoryCounts()).filter((c) => c.count > 0).slice(0, 5);
  const m = currentMarket(), path = currentPath(), en = m.locale === "en";
  const head = "mb-4 text-[10px] font-medium tracking-[0.22em] text-gold uppercase";
  return (
    <footer className="no-print bg-sand">
      <div className="container-x grid gap-10 py-16 text-[13px] md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <div className="text-[22px] leading-none font-extrabold tracking-[-0.03em] uppercase">{site.brand}</div>
          <p className="mt-4 max-w-[260px] leading-relaxed text-mute">{t.footer.about}</p>
          <address className="mt-6 space-y-1.5 not-italic">
            <div><span className="text-mute">{t.footer.phone}　</span><a href={`tel:${telE164(site.contactPhone).replace(/[^0-9+]/g, "")}`} className="hover:underline">{en ? telE164(site.contactPhone) : site.contactPhone}</a></div>
            <div><span className="text-mute">{t.footer.email}　</span><a href={`mailto:${site.contactEmail}`} className="hover:underline">{site.contactEmail}</a></div>
            <div><span className="text-mute">{t.footer.address}　</span><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address.full)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{en ? site.address.fullEn : site.address.full}</a></div>
          </address>
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
            <li><Link href="/blog" className="text-mute hover:text-ink">{t.nav.blog}</Link></li>
            <li><Link href="/guide#files" className="text-mute hover:text-ink">{t.guide.fileTitle}</Link></li>
            <li><Link href="/guide#shipping" className="text-mute hover:text-ink">{t.guide.shipTitle}</Link></li>
          </ul>
        </div>
        <div>
          <div className={head}>{t.footer.help}</div>
          <ul className="space-y-3">
            <li><Link href="/guide#faq" className="text-mute hover:text-ink">{t.nav.faq}</Link></li>
            <li><Link href="/returns" className="text-mute hover:text-ink">{t.returns.title}</Link></li>
            <li><Link href="/account" className="text-mute hover:text-ink">{t.nav.account}</Link></li>
            <li><Link href="/cart" className="text-mute hover:text-ink">{t.nav.cart}</Link></li>
            <li><a href={`mailto:${site.contactEmail}`} className="text-mute hover:text-ink">{t.nav.contact}</a></li>
          </ul>
        </div>
      </div>
      <nav className="container-x flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink/10 py-5 text-[12px]" aria-label={t.intl.switchTitle} data-testid="market-list">
        <span className="text-mute">{t.intl.switchTitle}</span>
        {marketList.map((x) => (
          // 換國家要整頁重新載入（語系、幣別、購物車都不同），所以用一般連結
          <a key={x.code} href={localize(path.startsWith("/blog/") && x.code !== m.code ? "/blog" : path, x) || "/"} hrefLang={x.lang} className={x.code === m.code ? "font-semibold" : "text-mute hover:text-ink"}>{x.countryName} ({x.currency})</a>
        ))}
      </nav>
      <div className="container-x border-t border-ink/10 py-6 text-[11px] text-gold">© {new Date().getFullYear()} {site.brand}. {t.footer.rights}</div>
    </footer>
  );
}
