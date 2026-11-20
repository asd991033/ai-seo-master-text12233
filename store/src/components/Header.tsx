import Link from "next/link";
import { site } from "@/config/site";
import { t } from "@/i18n";
import { getUser } from "@/lib/auth";
import { CartBadge } from "./CartBadge";

export async function Header() {
  const user = await getUser();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="container-x flex h-16 items-center gap-4">
        <Link href="/" className="serif flex items-baseline gap-2 text-xl font-bold tracking-wide text-forest">
          {site.brand}
          <span className="hidden text-xs font-medium tracking-[0.3em] text-gold sm:inline">{site.brandZh}</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-6 text-sm md:flex">
          <Link href="/products" className="hover:text-forest">{t.nav.products}</Link>
          <Link href="/guide" className="hover:text-forest">{t.nav.guide}</Link>
        </nav>
        <form action="/products" className="ml-auto hidden flex-1 justify-end sm:flex">
          <input name="q" placeholder={t.nav.search} aria-label={t.nav.search} className="input max-w-56 rounded-full" />
        </form>
        <div className="ml-auto flex items-center gap-4 text-sm sm:ml-0">
          <Link href="/products" className="md:hidden">{t.nav.products}</Link>
          {user?.role === "admin" && <Link href="/admin" className="text-gold hover:underline">{t.nav.admin}</Link>}
          <Link href={user ? "/account" : "/login"} className="hover:text-forest">{user ? t.nav.account : t.nav.login}</Link>
          <CartBadge label={t.nav.cart} />
        </div>
      </div>
    </header>
  );
}
