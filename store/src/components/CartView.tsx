"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import { site } from "@/config/site";
import { fmtMoney, fmtNum } from "@/lib/format";
import { useCart, type CartItem } from "@/lib/cart";
import { computeTotals, type LineQuote, type Totals } from "@/lib/pricing";
import type { Pack, ShipQuote } from "@/lib/shipping";

type QuoteLineRes = { id: string; ok: true; quote: LineQuote; labels: string[] } | { id: string; ok: false; error: string };
export type QuoteRes = { lines: QuoteLineRes[]; pack: Pack; zones: { code: string; name: string }[]; zoneCode: string | null; shipping: ShipQuote[] };

/** 向伺服器取得整車報價（含空運 / 海運運費） */
export function useCartQuote() {
  const items = useCart((s) => s.items);
  const zoneCode = useCart((s) => s.zoneCode) ?? site.defaultZone;
  const mode = useCart((s) => s.mode);
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<QuoteRes | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  useEffect(() => setHydrated(true), []);

  const key = JSON.stringify([items.map((i) => [i.id, i.productId, i.qty, i.prints]), zoneCode]);
  useEffect(() => {
    if (!hydrated) return;
    if (!items.length) return setData(null);
    const mine = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, zoneCode }) });
        const json = await res.json();
        if (mine === seq.current && res.ok) setData(json);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated]);

  const okLines = data?.lines.flatMap((l) => (l.ok ? [l.quote] : [])) ?? [];
  const allOk = !!data && data.lines.length === items.length && data.lines.every((l) => l.ok);
  const ship = data?.shipping.find((s) => s.mode === mode) ?? null;
  const totals: Totals | null = data && ship ? computeTotals(okLines, ship.fee, site.taxRate) : null;
  return { items, hydrated, data, loading, zoneCode, mode, ship, totals, allOk };
}

export function ItemThumb({ item }: { item: Pick<CartItem, "previewUrl" | "image" | "name"> }) {
  const src = item.previewUrl ?? item.image;
  return (
    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-sand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt={item.name} className="h-full w-full object-cover" />}
    </div>
  );
}

export function ShippingPicker({ q }: { q: ReturnType<typeof useCartQuote> }) {
  const setShipping = useCart((s) => s.setShipping);
  if (!q.data) return null;
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="label">{t.cart.shipTo}</span>
        <select className="input" value={q.data.zoneCode ?? ""} onChange={(e) => setShipping(e.target.value, q.mode)}>
          {q.data.zones.map((z) => <option key={z.code} value={z.code}>{z.name}</option>)}
        </select>
      </label>
      <div>
        <span className="label">{t.cart.shipMode}</span>
        <div className="grid grid-cols-2 gap-2">
          {q.data.shipping.map((s) => (
            <button key={s.mode} type="button" aria-pressed={q.mode === s.mode} onClick={() => setShipping(q.zoneCode, s.mode)}
              className={`rounded-xl border p-3 text-left transition ${q.mode === s.mode ? "border-forest bg-forest/5 ring-1 ring-forest" : "border-line bg-white hover:border-ink"}`}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{s.mode === "air" ? t.product.air : t.product.sea}</span>
                <span className="font-bold text-forest">{fmtMoney(s.fee)}</span>
              </div>
              <div className="mt-1 text-xs text-mute">{t.product.eta} {s.daysMin}–{s.daysMax} {t.product.etaDays}</div>
              <div className="text-xs text-mute">{s.unit === "kg" ? `${t.product.chargeableKg} ${fmtNum(s.chargeable)} kg` : `${t.product.chargeableCbm} ${fmtNum(s.chargeable)} CBM`}</div>
            </button>
          ))}
        </div>
        {!q.data.shipping.length && <p className="text-sm text-danger">{t.product.noShip}</p>}
      </div>
      <p className="text-xs text-mute">{t.cart.weight} {fmtNum(q.data.pack.weightKg)} kg・{t.cart.volume} {fmtNum(q.data.pack.cbm)} CBM{q.data.pack.cartons > 0 && `・${t.product.cartons} ${q.data.pack.cartons}`}</p>
    </div>
  );
}

export function TotalsBox({ totals, loading }: { totals: Totals | null; loading: boolean }) {
  const rows: [string, number][] = totals
    ? [[t.cart.goods, totals.goodsTotal], [t.cart.print, totals.printTotal], [t.cart.setup, totals.setupTotal], [t.cart.shipping, totals.shippingFee], ...(site.taxRate > 0 ? [[t.cart.tax, totals.tax] as [string, number]] : [])]
    : [];
  return (
    <dl className={`space-y-2 text-sm transition ${loading ? "opacity-50" : ""}`}>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between"><dt className="text-mute">{k}</dt><dd className="tabular-nums">{fmtMoney(v)}</dd></div>
      ))}
      <div className="flex items-end justify-between border-t border-line pt-3">
        <dt className="font-medium">{t.cart.total}</dt>
        <dd className="serif text-2xl font-bold text-forest" data-testid="grand-total">{totals ? fmtMoney(totals.total) : "—"}</dd>
      </div>
    </dl>
  );
}

export function CartView() {
  const q = useCartQuote();
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  if (!q.hydrated) return <p className="py-20 text-center text-mute">{t.common.loading}</p>;
  if (!q.items.length) {
    return (
      <div className="py-20 text-center">
        <p className="text-mute">{t.cart.empty}</p>
        <Link href="/products" className="btn-primary mt-6">{t.cart.goShop}</Link>
      </div>
    );
  }
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <ul className="space-y-4">
        {q.items.map((item) => {
          const line = q.data?.lines.find((l) => l.id === item.id);
          return (
            <li key={item.id} className="card flex gap-4 p-4">
              <ItemThumb item={item} />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <Link href={`/products/${item.slug}`} className="font-bold hover:text-forest">{item.name}</Link>
                  <button type="button" onClick={() => remove(item.id)} className="no-print shrink-0 text-xs text-mute hover:text-danger">{t.cart.remove}</button>
                </div>
                <div className="mt-1 text-xs text-mute">{item.sku}{item.colorName && `・${item.colorName}`}{item.sizeName && `・${item.sizeName}`}</div>
                <ul className="mt-2 space-y-0.5 text-xs text-mute">
                  {line?.ok ? (line.labels.length ? line.labels.map((l) => <li key={l}>{l}</li>) : <li>{t.cart.blank}</li>) : null}
                  {item.prints.length > 0 && (
                    <li className="text-gold">
                      {item.designId ? `✓ ${t.cart.design}` : item.artworkUrl ? `✓ ${t.cart.artwork}：${item.artworkName ?? ""}` : t.cart.artworkLater}
                      {item.designId && <Link href={`/design/${item.slug}?edit=${item.designId}&item=${item.id}`} className="no-print ml-2 underline hover:text-forest">{t.cart.editDesign}</Link>}
                    </li>
                  )}
                </ul>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-mute">
                    {t.cart.qty}
                    <input type="number" min={1} step={1} value={item.qty} onChange={(e) => setQty(item.id, Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="input w-24 py-1" />
                  </label>
                  {line?.ok ? (
                    <div className="text-right">
                      <div className="font-bold tabular-nums">{fmtMoney(line.quote.total)}</div>
                      <div className="text-xs text-mute">{t.cart.perUnit} {fmtMoney(line.quote.unitAllIn)}{line.quote.setupTotal > 0 && `・${t.cart.setup} ${fmtMoney(line.quote.setupTotal)}`}</div>
                    </div>
                  ) : line ? (
                    <p className="text-xs text-danger" role="alert">{line.error}</p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <aside className="card h-fit space-y-5 p-5 lg:sticky lg:top-24">
        <div className="font-bold">{t.cart.summary}</div>
        <ShippingPicker q={q} />
        <TotalsBox totals={q.totals} loading={q.loading} />
        <div className="no-print space-y-2">
          {q.allOk && q.totals ? (
            <Link href="/checkout" className="btn-primary w-full py-3">{t.cart.checkout}</Link>
          ) : (
            <button type="button" disabled className="btn-primary w-full py-3">{q.loading ? t.cart.updating : t.cart.checkout}</button>
          )}
        </div>
      </aside>
    </div>
  );
}
