"use client";
import { metaTrack, track } from "@/lib/track";
import { DIAL_CODES, intlPhone } from "@/config/markets";
import Link from "@/components/Link";
import { useEffect, useRef, useState } from "react";
import { useMarket, useMoney, useT } from "@/market/client";
import { useCart } from "@/lib/cart";
import { ItemThumb, ShippingPicker, TotalsBox, useCartQuote } from "./CartView";

type Defaults = { name: string; phone: string; email: string; company: string; taxId: string };

export function CheckoutForm({ defaults, online = false }: { defaults: Defaults; online?: boolean }) {
  const t = useT();
  const fmtMoney = useMoney();
  const market = useMarket();
  const q = useCartQuote();
  const clear = useCart((s) => s.clear);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 會員資料裡的電話若已是國際格式就拆開，否則當成本地號碼搭配這個國家站的國碼
  const phone0 = (() => {
    const p = defaults.phone.replace(/[\s-]/g, "");
    const hit = p.startsWith("+") ? [...DIAL_CODES].sort((x, y) => y[0].length - x[0].length).find(([c]) => p.startsWith(c)) : undefined;
    return hit ? { code: hit[0], number: p.slice(hit[0].length) } : { code: market.dial, number: p };
  })();

  // Meta 像素：進入結帳頁、金額算出來後送一次 InitiateCheckout
  const checkoutSent = useRef(false);
  const total = q.totals?.total;
  useEffect(() => {
    if (checkoutSent.current || total == null || !q.items.length) return;
    checkoutSent.current = true;
    metaTrack("InitiateCheckout", { content_ids: [...new Set(q.items.map((i) => i.sku))], content_type: "product", contents: q.items.map((i) => ({ id: i.sku, quantity: i.qty })), num_items: q.items.reduce((a, i) => a + i.qty, 0), value: total, currency: market.currency });
  }, [total, q.items, market.currency]);

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
    // 電話存成國際格式（國碼 + 號碼）
    const contactPhone = intlPhone(String(fd.phoneCode ?? market.dial), String(fd.phoneNumber ?? ""));
    track("begin_checkout", { currency: market.currency, value: q.totals?.total ?? 0, items: q.items.map((i) => ({ item_id: i.sku, item_name: i.name, quantity: i.qty })) });
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fd, contactPhone, items: q.items, zoneCode: q.data?.zoneCode, mode: q.mode, market: market.code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t.checkout.failed);
      clear();
      if (json.payUrl) window.location.assign(json.payUrl);
      else window.location.assign(json.orderUrl ?? `/orders/${json.orderNo}?new=1`);
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
            <label className="block">
              <span className="label">{t.checkout.phone}</span>
              <span className="flex gap-2">
                <select name="phoneCode" defaultValue={phone0.code} aria-label={t.intl.dialCode} className="input w-[112px] shrink-0 px-2" data-testid="phone-code">
                  {DIAL_CODES.map(([c, n]) => <option key={c} value={c}>{c} {n}</option>)}
                </select>
                <input name="phoneNumber" type="tel" inputMode="tel" required defaultValue={phone0.number} autoComplete="tel-national" pattern="[0-9 \-]{6,15}" className="input min-w-0 flex-1" />
              </span>
            </label>
            {field("contactEmail", t.checkout.email, { required: true, def: defaults.email, type: "email", auto: "email" })}
            {field("company", t.checkout.company, { def: defaults.company, auto: "organization" })}
            {market.code === "tw" && field("taxId", t.checkout.taxId, { def: defaults.taxId })}
          </div>
          {market.code === "tw" ? (
            <>
              {field("postcode", t.checkout.postcode, { required: true, auto: "postal-code" })}
              {field("address", t.checkout.address, { required: true, auto: "street-address" })}
            </>
          ) : (
            <>
              {field("address", t.checkout.address, { required: true, auto: "street-address" })}
              <div className="grid gap-4 sm:grid-cols-3">
                {field("city", t.intl.city, { required: true, auto: "address-level2" })}
                {field("region", t.intl.region, { auto: "address-level1" })}
                {field("postcode", t.checkout.postcode, { required: true, auto: "postal-code" })}
              </div>
              <label className="block">
                <span className="label">{t.intl.country}</span>
                <input value={market.countryName} readOnly className="input bg-sand" data-testid="country" />
              </label>
            </>
          )}
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
          <div className="rounded-xl border border-forest bg-forest/5 p-3" data-testid="pay-online">
            <span className="font-medium">{t.checkout.online}</span><span className="block text-xs text-mute">{online ? t.checkout.onlineHint : t.checkout.onlineOff}</span>
          </div>
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
        <p className="text-xs leading-relaxed text-mute" data-testid="returns-notice">{t.checkout.returnsNotice}<Link href="/returns" target="_blank" className="underline underline-offset-2">{t.returns.title}</Link>{market.locale === "en" ? "." : "。"}</p>
        <button type="submit" disabled={submitting || !q.allOk || !q.totals} className="btn-primary w-full py-3">{submitting ? t.checkout.submitting : t.checkout.submit}</button>
        <p className="text-xs leading-relaxed text-mute">{t.checkout.agree}</p>
      </aside>
    </form>
  );
}
