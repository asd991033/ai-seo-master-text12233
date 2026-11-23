"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/i18n";
import { fmtMoney } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { ItemThumb, ShippingPicker, TotalsBox, useCartQuote } from "./CartView";

type Defaults = { name: string; phone: string; email: string; company: string; taxId: string };

export function CheckoutForm({ defaults, online = false }: { defaults: Defaults; online?: boolean }) {
  const router = useRouter();
  const q = useCartQuote();
  const clear = useCart((s) => s.clear);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!q.hydrated) return <p className="py-20 text-center text-mute">{t.common.loading}</p>;
  if (!q.items.length && !submitting) {
    return (
      <div className="py-20 text-center">
        <p className="text-mute">{t.cart.empty}</p>
        <Link href="/products" className="btn-primary mt-6">{t.cart.goShop}</Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fd, items: q.items, zoneCode: q.data?.zoneCode, mode: q.mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t.checkout.failed);
      clear();
      if (json.payUrl) window.location.assign(json.payUrl);
      else router.push(`/orders/${json.orderNo}?new=1`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const field = (name: string, label: string, opts: { required?: boolean; type?: string; def?: string; auto?: string } = {}) => (
    <label className="block">
      <span className="label">{label}</span>
      <input name={name} type={opts.type ?? "text"} required={opts.required} defaultValue={opts.def} autoComplete={opts.auto} className="input" />
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="card space-y-4 p-5">
          <h2 className="text-lg font-bold">{t.checkout.contact}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("contactName", t.checkout.name, { required: true, def: defaults.name, auto: "name" })}
            {field("contactPhone", t.checkout.phone, { required: true, def: defaults.phone, type: "tel", auto: "tel" })}
            {field("contactEmail", t.checkout.email, { required: true, def: defaults.email, type: "email", auto: "email" })}
            {field("company", t.checkout.company, { def: defaults.company, auto: "organization" })}
            {field("taxId", t.checkout.taxId, { def: defaults.taxId })}
          </div>
          {field("address", t.checkout.address, { required: true, auto: "street-address" })}
          <label className="block">
            <span className="label">{t.checkout.note}</span>
            <textarea name="note" rows={3} placeholder={t.checkout.notePh} className="input" />
          </label>
        </section>
        <section className="card space-y-4 p-5">
          <h2 className="text-lg font-bold">{t.cart.shipMode}</h2>
          <ShippingPicker q={q} />
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-bold">{t.checkout.payment}</h2>
          {online ? (
            <div className="rounded-xl border border-forest bg-forest/5 p-3" data-testid="pay-online">
              <span className="font-medium">{t.checkout.online}</span><span className="block text-xs text-mute">{t.checkout.onlineHint}</span>
            </div>
          ) : (
            <label className="flex items-start gap-3 rounded-xl border border-forest bg-forest/5 p-3">
              <input type="radio" name="paymentMethod" value="bank_transfer" defaultChecked className="mt-1 accent-[var(--color-forest)]" />
              <span><span className="font-medium">{t.checkout.bank}</span><span className="block text-xs text-mute">{t.checkout.bankHint}</span></span>
            </label>
          )}
        </section>
      </div>
      <aside className="card h-fit space-y-5 p-5 lg:sticky lg:top-24">
        <div className="font-bold">{t.cart.summary}</div>
        <ul className="space-y-3">
          {q.items.map((item) => {
            const line = q.data?.lines.find((l) => l.id === item.id);
            return (
              <li key={item.id} className="flex gap-3 text-sm">
                <div className="scale-75 origin-top-left -mr-6 -mb-6"><ItemThumb item={item} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="text-xs text-mute">× {item.qty}{item.colorName && `・${item.colorName}`}{item.sizeName && `・${item.sizeName}`}</div>
                </div>
                <div className="tabular-nums">{line?.ok ? fmtMoney(line.quote.total) : "—"}</div>
              </li>
            );
          })}
        </ul>
        <TotalsBox totals={q.totals} loading={q.loading} />
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button type="submit" disabled={submitting || !q.allOk || !q.totals} className="btn-primary w-full py-3">{submitting ? t.checkout.submitting : t.checkout.submit}</button>
        <p className="text-xs leading-relaxed text-mute">{t.checkout.agree}</p>
      </aside>
    </form>
  );
}
