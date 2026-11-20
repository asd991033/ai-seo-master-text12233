"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { t } from "@/i18n";
import { IconClose, IconMenu } from "./Icons";

export function MobileMenu({ categories, loggedIn, admin }: { categories: { slug: string; name: string }[]; loggedIn: boolean; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <button type="button" className="-ml-2 p-2 md:hidden" aria-label={t.nav.menu} aria-expanded={open} onClick={() => setOpen(true)}><IconMenu /></button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[84%] max-w-sm flex-col overflow-y-auto bg-paper p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="serif text-lg font-bold text-forest">{t.nav.menu}</span>
              <button type="button" className="p-2" aria-label={t.common.close} onClick={() => setOpen(false)}><IconClose /></button>
            </div>
            <form action="/products" className="mt-4"><input name="q" placeholder={t.nav.search} aria-label={t.nav.search} className="input rounded-full" /></form>
            <nav className="mt-6 space-y-1 text-[15px]">
              <Link href="/products" className="block rounded-lg px-3 py-2.5 font-medium hover:bg-sand">{t.nav.products}</Link>
              <div className="px-3 pt-4 pb-1 text-xs tracking-widest text-gold">{t.nav.categories}</div>
              {categories.map((c) => (
                <Link key={c.slug} href={`/products?category=${encodeURIComponent(c.slug)}`} className="block rounded-lg px-3 py-2 hover:bg-sand">{c.name}</Link>
              ))}
              <div className="my-3 border-t border-line" />
              <Link href="/guide" className="block rounded-lg px-3 py-2.5 hover:bg-sand">{t.nav.guide}</Link>
              <Link href={loggedIn ? "/account" : "/login"} className="block rounded-lg px-3 py-2.5 hover:bg-sand">{loggedIn ? t.nav.account : t.nav.login}</Link>
              {admin && <Link href="/admin" className="block rounded-lg px-3 py-2.5 text-gold hover:bg-sand">{t.nav.admin}</Link>}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
