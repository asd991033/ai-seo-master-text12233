import Link from "@/components/Link";
import { site } from "@/config/site";
import { t } from "@/i18n";
import { getUser } from "@/lib/auth";
import { MarketSwitcher } from "./MarketSwitcher";
import { categoryCounts } from "@/lib/catalog";
import { CartBadge } from "./CartBadge";
import { MobileMenu } from "./MobileMenu";
import { IconSearch, IconUser } from "./Icons";

/** 浮動的白色圓角頁首 */
export async function Header() {
  const [user, cats] = await Promise.all([getUser(), categoryCounts()]);
  const list = cats.filter((c) => c.count > 0);
  return (
    <header className="no-print sticky top-0 z-40 px-3 pt-2.5 sm:px-8">
      <div className="relative mx-auto flex h-[60px] max-w-[1336px] items-center gap-2 rounded-[14px] border border-line/70 bg-white/95 px-4 shadow-[0_6px_24px_-12px_rgba(0,0,0,.25)] backdrop-blur sm:px-8">
        <MobileMenu categories={list} loggedIn={!!user} admin={user?.role === "admin"} />
        <Link href="/" className="text-[22px] leading-none font-extrabold tracking-[-0.03em] uppercase">{site.brand}</Link>
        <nav className="ml-6 hidden h-full items-center gap-7 text-[15px] md:flex">
          <div className="group flex h-full items-center">
            <Link href="/products" className="flex items-center gap-2 hover:opacity-60">
              <span className="grid grid-cols-2 gap-[3px]">{[0, 1, 2, 3].map((i) => <i key={i} className="h-[4px] w-[4px] rounded-[1px] bg-ink" />)}</span>
              {t.nav.catalogue}
            </Link>
            <div className="invisible absolute inset-x-0 top-full pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="grid max-h-[72vh] grid-cols-3 gap-x-8 gap-y-6 overflow-y-auto rounded-[14px] border border-line bg-white p-7 shadow-xl lg:grid-cols-4 xl:grid-cols-5" data-testid="mega-menu">
                {list.map((c) => (
                  <div key={c.id}>
                    <Link href={`/products?category=${encodeURIComponent(c.slug)}`} className="flex items-baseline justify-between gap-2 border-b border-line pb-2 text-[14px] font-semibold hover:opacity-60">
                      <span>{c.name}</span><span className="text-xs font-normal text-mute">{c.count}</span>
                    </Link>
                    <ul className="mt-2 space-y-1.5 text-[13px]">
                      {c.children.slice(0, 7).map((k) => <li key={k.id}><Link href={`/products?category=${encodeURIComponent(k.slug)}`} className="text-mute hover:text-ink">{k.name}</Link></li>)}
                      {c.children.length > 7 && <li><Link href={`/products?category=${encodeURIComponent(c.slug)}`} className="text-xs text-mute underline underline-offset-4 hover:text-ink">＋{c.children.length - 7}</Link></li>}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Link href="/guide" className="hover:opacity-60">{t.nav.guide}</Link>
          <Link href="/guide#methods" className="hover:opacity-60">{t.nav.methods}</Link>
          <Link href="/guide#faq" className="hover:opacity-60">{t.nav.faq}</Link>
          <Link href="/blog" className="hover:opacity-60">{t.nav.blog}</Link>
          <a href={`mailto:${site.contactEmail}`} className="hover:opacity-60">{t.nav.contact}</a>
        </nav>
        <div className="ml-auto flex items-center">
          <MarketSwitcher />
          {user?.role === "admin" && <Link href="/admin" className="hidden px-2 text-sm text-mute hover:text-ink md:block">{t.nav.admin}</Link>}
          <Link href="/products" className="p-2 hover:opacity-60" aria-label={t.nav.search} title={t.nav.search}><IconSearch className="h-5 w-5" /></Link>
          <Link href={user ? "/account" : "/login"} className="p-2 hover:opacity-60" aria-label={user ? t.nav.account : t.nav.login} title={user ? t.nav.account : t.nav.login}><IconUser className="h-5 w-5" /></Link>
          <CartBadge label={t.nav.cart} />
        </div>
      </div>
    </header>
  );
}
