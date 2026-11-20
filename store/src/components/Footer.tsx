import Link from "next/link";
import { site } from "@/config/site";
import { t } from "@/i18n";
import { categoryCounts } from "@/lib/catalog";

export async function Footer() {
  const cats = (await categoryCounts()).filter((c) => c.count > 0).slice(0, 6);
  return (
    <footer className="no-print mt-24 bg-forest-dark text-white/80">
      <div className="container-x grid gap-10 py-14 text-sm md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="serif text-2xl font-bold text-white">{site.brand}</div>
          <p className="mt-4 max-w-xs leading-relaxed text-white/60">{t.footer.about}</p>
        </div>
        <div>
          <div className="mb-4 text-xs tracking-widest text-gold">{t.footer.shop}</div>
          <ul className="space-y-2.5">
            {cats.map((c) => <li key={c.id}><Link href={`/products?category=${encodeURIComponent(c.slug)}`} className="hover:text-white">{c.name}</Link></li>)}
            <li><Link href="/products" className="hover:text-white">{t.home.viewAll} →</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-4 text-xs tracking-widest text-gold">{t.footer.help}</div>
          <ul className="space-y-2.5">
            <li><Link href="/guide" className="hover:text-white">{t.nav.guide}</Link></li>
            <li><Link href="/guide#files" className="hover:text-white">{t.guide.fileTitle}</Link></li>
            <li><Link href="/guide#shipping" className="hover:text-white">{t.guide.shipTitle}</Link></li>
            <li><Link href="/guide#faq" className="hover:text-white">{t.guide.faqTitle}</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-4 text-xs tracking-widest text-gold">{t.footer.account}</div>
          <ul className="space-y-2.5">
            <li><Link href="/account" className="hover:text-white">{t.nav.account}</Link></li>
            <li><Link href="/cart" className="hover:text-white">{t.nav.cart}</Link></li>
            <li><a href={`mailto:${site.contactEmail}`} className="hover:text-white">{site.contactEmail}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">© {new Date().getFullYear()} {site.brand}. {t.footer.rights}</div>
    </footer>
  );
}
