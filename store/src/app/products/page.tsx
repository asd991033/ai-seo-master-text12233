import Link from "next/link";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { listCategories, listProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t.products.title };

type SP = { category?: string; q?: string; sort?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [cats, items] = await Promise.all([listCategories(), listProducts(sp)]);
  const href = (patch: Partial<SP>) => {
    const next = { ...sp, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return `/products${qs ? `?${qs}` : ""}`;
  };
  const sorts = ["default", "price_asc", "price_desc"] as const;
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">{sp.q ? t.products.resultFor(sp.q) : t.products.title}</h1>
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
    </div>
  );
}
