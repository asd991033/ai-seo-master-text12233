import Link from "next/link";
import { t } from "@/i18n";
import { fmtMoney } from "@/lib/format";
import { priceRange } from "@/lib/pricing";
import type { ProductCard as Card } from "@/lib/catalog";

export function ProductCard({ p }: { p: Card }) {
  const range = priceRange(p.tiers);
  return (
    <Link href={`/products/${p.slug}`} className="group card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="aspect-square overflow-hidden bg-sand">
        {p.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        )}
      </div>
      <div className="p-4">
        {p.categoryName && <div className="text-xs text-gold">{p.categoryName}</div>}
        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug">{p.name}</h3>
        <div className="mt-3 flex items-end justify-between">
          <div className="text-forest">
            {range && (
              <>
                <span className="text-lg font-bold">{fmtMoney(range.min)}</span>
                {range.max > range.min && <span className="text-sm text-mute"> ~ {fmtMoney(range.max)}</span>}
              </>
            )}
          </div>
          <div className="text-xs text-mute">{t.products.moq} {p.moq} {t.products.pcs}</div>
        </div>
        {p.colors.length > 1 && (
          <div className="mt-3 flex gap-1.5">
            {p.colors.slice(0, 6).map((c) => (
              <span key={c.name} title={c.name} className="h-4 w-4 rounded-full border border-line" style={{ background: c.hex }} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
