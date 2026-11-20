import Link from "next/link";
import { site } from "@/config/site";
import { t } from "@/i18n";
import { getUser } from "@/lib/auth";
import { categoryCounts } from "@/lib/catalog";
import { CartBadge } from "./CartBadge";
import { MobileMenu } from "./MobileMenu";
import { IconSearch, IconUser } from "./Icons";

export async function Header() {
  const [user, cats] = await Promise.all([getUser(), categoryCounts()]);
  const list = cats.filter((c) => c.count > 0);
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="bg-forest py-1.5 text-center text-[12px] tracking-wide text-white/90">{t.nav.announce}</div>
      <div className="container-x flex h-16 items-center gap-3">
        <MobileMenu categories={list} loggedIn={!!user} admin={user?.role === "admin"} />
        <Link href="/" className="serif text-[22px] font-bold tracking-wide text-forest">{site.brand}</Link>
        <nav className="ml-8 hidden h-full items-center gap-7 text-sm md:flex">
          <div className="group flex h-full items-center">
            <Link href="/products" className="hover:text-forest">{t.nav.products}</Link>
            {/* 分類選單 */}
            <div className="invisible absolute inset-x-0 top-full border-b border-line bg-paper opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="container-x grid grid-cols-4 gap-x-8 gap-y-1 py-6 lg:grid-cols-6">
                {list.map((c) => (
                  <Link key={c.id} href={`/products?category=${encodeURIComponent(c.slug)}`} className="flex items-baseline justify-between rounded-lg px-3 py-2 hover:bg-sand">
                    <span>{c.name}</span>
                    <span className="text-xs text-mute">{c.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Link href="/guide" className="hover:text-forest">{t.nav.guide}</Link>
        </nav>
        <form action="/products" className="relative ml-auto hidden w-64 md:block">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-mute" />
          <input name="q" placeholder={t.nav.search} aria-label={t.nav.search} className="input rounded-full bg-white/70 pl-10" />
        </form>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          {user?.role === "admin" && <Link href="/admin" className="hidden px-2 text-sm text-gold hover:underline md:block">{t.nav.admin}</Link>}
          <Link href="/products" className="p-2 md:hidden" aria-label={t.nav.search}><IconSearch /></Link>
          <Link href={user ? "/account" : "/login"} className="p-2 hover:text-forest" aria-label={user ? t.nav.account : t.nav.login} title={user ? t.nav.account : t.nav.login}><IconUser /></Link>
          <CartBadge label={t.nav.cart} />
        </div>
      </div>
    </header>
  );
}
