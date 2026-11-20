import Link from "next/link";
import { t } from "@/i18n";
import { fmtMoney } from "@/lib/format";
import { priceRange } from "@/lib/pricing";
import type { ProductCard as Card } from "@/lib/catalog";

export function ProductCard({ p }: { p: Card }) {
  const range = priceRange(p.tiers);
  const hover = p.images[1];
  return (
    <Link href={`/products/${p.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-line transition group-hover:shadow-[0_12px_32px_-12px_rgba(35,66,58,.35)]">
        {p.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={p.name} className={`h-full w-full object-cover transition duration-500 ${hover ? "group-hover:opacity-0" : "group-hover:scale-[1.04]"}`} loading="lazy" />
        )}
        {hover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" loading="lazy" />
        )}
        {p.moq <= 1 && <span className="absolute top-3 left-3 rounded-full bg-paper/95 px-2.5 py-1 text-[11px] font-medium text-forest shadow-sm">{t.products.moqOne}</span>}
      </div>
      <div className="px-1 pt-3.5">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-medium group-hover:text-forest">{p.name}</h3>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {range && <div className="text-forest"><span className="font-bold">{fmtMoney(range.min)}</span><span className="text-xs text-mute"> {t.products.from}</span></div>}
          {p.colors.length > 1 && (
            <div className="flex items-center gap-1">
              {p.colors.slice(0, 5).map((c) => <span key={c.name} title={c.name} className="h-3 w-3 rounded-full ring-1 ring-line" style={{ background: c.hex }} />)}
              {p.colors.length > 5 && <span className="text-[11px] text-mute">+{p.colors.length - 5}</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
