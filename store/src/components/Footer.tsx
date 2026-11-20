import Link from "next/link";
import { site } from "@/config/site";
import { t } from "@/i18n";

export function Footer() {
  return (
    <footer className="no-print mt-20 border-t border-line bg-sand">
      <div className="container-x grid gap-8 py-12 text-sm sm:grid-cols-3">
        <div>
          <div className="serif text-lg font-bold text-forest">{site.brand} <span className="text-xs tracking-[0.3em] text-gold">{site.brandZh}</span></div>
          <p className="mt-3 max-w-xs leading-relaxed text-mute">{t.footer.about}</p>
        </div>
        <div>
          <div className="mb-3 font-medium">{t.footer.links}</div>
          <ul className="space-y-2 text-mute">
            <li><Link href="/products" className="hover:text-ink">{t.nav.products}</Link></li>
            <li><Link href="/guide" className="hover:text-ink">{t.nav.guide}</Link></li>
            <li><Link href="/account" className="hover:text-ink">{t.nav.account}</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 font-medium">{t.footer.service}</div>
          <a href={`mailto:${site.contactEmail}`} className="text-mute hover:text-ink">{site.contactEmail}</a>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-mute">© {new Date().getFullYear()} {site.brand}. {t.footer.rights}</div>
    </footer>
  );
}
