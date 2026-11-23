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
  const item = (active: boolean) => `flex items-baseline justify-between rounded-[10px] px-3 py-2 text-[13px] transition ${active ? "bg-ink font-medium text-white" : "hover:bg-sand"}`;
  return (
    <div className="-mt-[70px]">
      <div className="relative h-[190px] overflow-hidden rounded-b-[22px] bg-sand md:h-[230px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/eg/coll-banner.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="container-x pt-8 pb-20">
        <h1 className="text-[32px] md:text-[38px]">{sp.q ? t.products.resultFor(sp.q) : current?.name ?? t.products.title}</h1>
        <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-mute">{t.products.listLead}</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
              <Link href={href({ category: undefined })} className={`shrink-0 ${sp.category ? "chip" : "chip-on"}`}>{t.products.all}</Link>
              {list.map((c) => <Link key={c.id} href={href({ category: c.slug })} className={`shrink-0 ${sp.category === c.slug ? "chip-on" : "chip"}`}>{c.name}</Link>)}
            </div>
            <div className="sticky top-24 hidden lg:block">
              <div className="text-[20px] font-bold tracking-tight">{t.products.filters}</div>
              <div className="mt-5 border-t border-line pt-4 text-[12px] font-semibold">{t.products.filter}</div>
              <div className="mt-3 space-y-0.5">
                <Link href={href({ category: undefined })} className={item(!sp.category)}><span>{t.products.all}</span><span className="text-xs opacity-60">{all}</span></Link>
                {list.map((c) => (
                  <Link key={c.id} href={href({ category: c.slug })} className={item(sp.category === c.slug)}><span>{c.name}</span><span className="text-xs opacity-60">{c.count}</span></Link>
                ))}
              </div>
            </div>
          </aside>
          <div className="min-w-0">
            <div className="mb-4 flex items-center justify-end gap-4 text-[12px] text-mute">
              <span>{t.products.count(total)}</span>
              <div className="flex gap-1 rounded-[12px] border border-line bg-white p-1">
                {sorts.map((s) => (
                  <Link key={s} href={href({ sort: s === "default" ? undefined : s })} className={`rounded-[9px] px-3 py-1.5 ${(sp.sort ?? "default") === s ? "bg-ink text-white" : "hover:text-ink"}`}>{t.products.sort[s]}</Link>
                ))}
              </div>
            </div>
            {items.length ? (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
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

        <div className="mt-20 max-w-2xl border-t border-line pt-10">
          <h2 className="text-[22px]">{t.products.compareTitle}</h2>
          <ul className="mt-5 list-disc space-y-3 pl-5 text-[13px] leading-relaxed text-mute">
            {t.products.compare.map(([k, v]) => <li key={k}><strong className="text-ink">{k}。</strong>{v}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
