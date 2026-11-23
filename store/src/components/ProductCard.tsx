import Link from "next/link";
import { t } from "@/i18n";
import { fmtMoney } from "@/lib/format";
import { priceRange } from "@/lib/pricing";
import type { ProductCard as Card } from "@/lib/catalog";

/** 白底圓角卡片：圖片、品名、起始價、「開始設計」按鈕（對應 B2B 站的 Add to Quote） */
export function ProductCard({ p }: { p: Card }) {
  const range = priceRange(p.tiers);
  const hover = p.images[1];
  return (
    <Link href={`/products/${p.slug}`} className="group flex flex-col rounded-[14px] border border-line bg-white p-2.5 transition hover:shadow-[0_10px_30px_-14px_rgba(0,0,0,.35)]">
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-sand">
        {p.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={p.name} loading="lazy" className={`h-full w-full object-cover transition duration-500 ${hover ? "group-hover:opacity-0" : "group-hover:scale-[1.04]"}`} />
        )}
        {hover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hover} alt={`${p.name}｜另一個角度`} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
        )}
      </div>
      <div className="flex flex-1 flex-col px-1.5 pt-3 pb-1">
        <h3 className="line-clamp-2 min-h-[2.6em] text-[13px] leading-[1.3] font-medium tracking-normal">{p.name}</h3>
        <div className="mt-1 flex items-center justify-between gap-2">
          {range && <div className="text-[13px] font-semibold text-mute">{fmtMoney(range.min)} <span className="font-normal">{t.products.from}</span></div>}
          {p.colors.length > 1 && (
            <div className="flex items-center gap-1">
              {p.colors.slice(0, 4).map((c) => <span key={c.name} title={c.name} className="h-2.5 w-2.5 rounded-full ring-1 ring-line" style={{ background: c.hex }} />)}
              {p.colors.length > 4 && <span className="text-[10px] text-mute">+{p.colors.length - 4}</span>}
            </div>
          )}
        </div>
        <span className="mt-3 flex items-center justify-center gap-1.5 rounded-[12px] border border-ink py-2 text-xs font-medium transition group-hover:bg-ink group-hover:text-white">＋ {t.products.cardCta}</span>
      </div>
    </Link>
  );
}
