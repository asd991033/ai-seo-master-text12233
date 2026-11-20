import Link from "next/link";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { categoryCounts, countProducts, listProducts, PAGE_SIZE } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

type SP = { category?: string; q?: string; sort?: string; page?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = sp.category ? (await categoryCounts()).find((c) => c.slug === sp.category) : null;
  return { title: cat?.name ?? (sp.q ? t.products.resultFor(sp.q) : t.products.title) };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));
  const [cats, items, total] = await Promise.all([categoryCounts(), listProducts({ ...sp, page }), countProducts(sp)]);
  const list = cats.filter((c) => c.count > 0);
  const all = list.reduce((a, c) => a + c.count, 0);
  const current = list.find((c) => c.slug === sp.category);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (patch: Partial<SP>) => {
    const next = { ...sp, page: undefined, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return `/products${qs ? `?${qs}` : ""}`;
  };
  const sorts = ["default", "price_asc", "price_desc"] as const;
  const item = (active: boolean) => `flex items-baseline justify-between rounded-lg px-3 py-2 text-sm transition ${active ? "bg-forest font-medium text-white" : "hover:bg-sand"}`;
  return (
    <div className="container-x py-8">
      <nav className="text-xs text-mute"><Link href="/" className="hover:text-ink">{t.common.backHome}</Link> / {current ? <><Link href="/products" className="hover:text-ink">{t.products.title}</Link> / {current.name}</> : t.products.title}</nav>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">{sp.q ? t.products.resultFor(sp.q) : current?.name ?? t.products.title}</h1>
          <p className="mt-2 text-sm text-mute">{t.products.count(total)}</p>
        </div>
        <div className="flex gap-1 rounded-full border border-line bg-white p-1 text-sm">
          {sorts.map((s) => (
            <Link key={s} href={href({ sort: s === "default" ? undefined : s })} className={`rounded-full px-3.5 py-1.5 ${(sp.sort ?? "default") === s ? "bg-forest text-white" : "text-mute hover:text-ink"}`}>{t.products.sort[s]}</Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside>
          {/* 手機：橫向捲動的分類 */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
            <Link href={href({ category: undefined })} className={`shrink-0 ${sp.category ? "chip" : "chip-on"}`}>{t.products.all}</Link>
            {list.map((c) => <Link key={c.id} href={href({ category: c.slug })} className={`shrink-0 ${sp.category === c.slug ? "chip-on" : "chip"}`}>{c.name}</Link>)}
          </div>
          <div className="sticky top-32 hidden lg:block">
            <div className="mb-3 px-3 text-xs tracking-widest text-gold">{t.products.filter}</div>
            <div className="space-y-0.5">
              <Link href={href({ category: undefined })} className={item(!sp.category)}><span>{t.products.all}</span><span className="text-xs opacity-70">{all}</span></Link>
              {list.map((c) => (
                <Link key={c.id} href={href({ category: c.slug })} className={item(sp.category === c.slug)}><span>{c.name}</span><span className="text-xs opacity-70">{c.count}</span></Link>
              ))}
            </div>
          </div>
        </aside>
        <div>
          {items.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
              {items.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          ) : (
            <p className="py-20 text-center text-mute">{t.products.empty}</p>
          )}
          {pages > 1 && (
            <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="pagination">
              {page > 1 && <Link href={href({ page: String(page - 1) })} className="chip">‹</Link>}
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2)
                .map((n, i, arr) => (
                  <span key={n} className="flex items-center gap-2">
                    {i > 0 && n - arr[i - 1] > 1 && <span className="text-mute">…</span>}
                    <Link href={href({ page: String(n) })} className={n === page ? "chip-on" : "chip"} aria-current={n === page ? "page" : undefined}>{n}</Link>
                  </span>
                ))}
              {page < pages && <Link href={href({ page: String(page + 1) })} className="chip">›</Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
