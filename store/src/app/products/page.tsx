import Link from "next/link";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { countProducts, listCategories, listProducts, PAGE_SIZE } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t.products.title };

type SP = { category?: string; q?: string; sort?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));
  const [cats, items, total] = await Promise.all([listCategories(), listProducts({ ...sp, page }), countProducts(sp)]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (patch: Partial<SP>) => {
    const next = { ...sp, page: undefined, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return `/products${qs ? `?${qs}` : ""}`;
  };
  const sorts = ["default", "price_asc", "price_desc"] as const;
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">{sp.q ? t.products.resultFor(sp.q) : t.products.title} <span className="text-base font-normal text-mute">（{total}）</span></h1>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href={href({ category: undefined })} className={sp.category ? "chip" : "chip-on"}>{t.products.all}</Link>
        {cats.map((c) => (
          <Link key={c.id} href={href({ category: c.slug })} className={sp.category === c.slug ? "chip-on" : "chip"}>{c.name}</Link>
        ))}
        <div className="ml-auto flex gap-3 text-sm text-mute">
          {sorts.map((s) => (
            <Link key={s} href={href({ sort: s === "default" ? undefined : s })} className={(sp.sort ?? "default") === s ? "font-medium text-forest underline underline-offset-4" : "hover:text-ink"}>
              {t.products.sort[s]}
            </Link>
          ))}
        </div>
      </div>
      {items.length ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      ) : (
        <p className="mt-16 text-center text-mute">{t.products.empty}</p>
      )}
      {pages > 1 && (
        <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="pagination">
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
  );
}
