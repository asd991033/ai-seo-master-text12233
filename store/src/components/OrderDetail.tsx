import { t } from "@/i18n";
import { fmtDate, fmtMoney as money, fmtNum } from "@/lib/format";
import type { schema } from "@/db";
import type { LineQuote } from "@/lib/pricing";

type Order = typeof schema.orders.$inferSelect;
type Item = typeof schema.orderItems.$inferSelect;

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "cancelled" ? "bg-danger/10 text-danger" : status === "completed" ? "bg-forest/10 text-forest" : "bg-gold/15 text-gold";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>{t.order.statuses[status] ?? status}</span>;
}

export function OrderDetail({ order, items, extra }: { order: Order; items: Item[]; extra?: (item: Item) => React.ReactNode }) {
  // 金額一律用下單當時的幣別顯示
  const fmtMoney = (n: number) => money(n, order.currency);
  const rows: [string, number][] = [
    [t.cart.goods, order.goodsTotal], [t.cart.print, order.printTotal], [t.cart.setup, order.setupTotal], [t.cart.shipping, order.shippingFee],
    ...(order.tax > 0 ? [[t.cart.tax, order.tax] as [string, number]] : []),
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section>
        <h2 className="mb-4 text-lg font-bold">{t.order.items}</h2>
        <ul className="space-y-4">
          {items.map((it) => {
            const b = it.breakdown as { quote: LineQuote; labels: string[] };
            return (
              <li key={it.id} className="card p-4">
                <div className="flex gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {it.previewUrl && <img src={it.previewUrl} alt={it.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex justify-between gap-3 font-bold"><span>{it.name}</span><span className="tabular-nums">{fmtMoney(it.lineTotal)}</span></div>
                    <div className="mt-1 text-xs text-mute">{it.sku}{it.colorName && `・${it.colorName}`}{it.sizeName && `・${it.sizeName}`}・{fmtMoney(b.quote.baseUnitPrice)} × {fmtNum(it.qty)}</div>
                    <ul className="mt-2 space-y-0.5 text-xs text-mute">
                      {b.labels.length ? b.quote.prints.map((p, i) => (
                        <li key={i}>{b.labels[i]}　{p.total > 0 ? `${fmtMoney(p.unitPrice)} × ${fmtNum(it.qty)}` : t.product.included}{p.setupFee > 0 && `　＋${t.cart.setup} ${fmtMoney(p.setupFee)}`}</li>
                      )) : <li>{t.cart.blank}</li>}
                      {b.quote.extraFaceTotal > 0 && <li>{t.product.extraFace(b.quote.extraFaces)}　{fmtMoney(b.quote.extraFaceUnit * b.quote.extraFaces)} × {fmtNum(it.qty)}</li>}
                    </ul>
                  </div>
                </div>
                {extra?.(it)}
              </li>
            );
          })}
        </ul>
      </section>
      <aside className="space-y-5">
        <div className="card space-y-2 p-5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between"><span className="text-mute">{k}</span><span className="tabular-nums">{fmtMoney(v)}</span></div>
          ))}
          <div className="flex items-end justify-between border-t border-line pt-3">
            <span className="font-medium">{t.cart.total}</span>
            <span className="serif text-2xl font-bold text-forest">{fmtMoney(order.total)}</span>
          </div>
          <div className="pt-1 text-xs">{order.paid ? <span className="text-forest">✓ {t.order.paid}</span> : <span className="text-gold">{t.order.unpaid}</span>}</div>
        </div>
        <div className="card space-y-1.5 p-5 text-sm">
          <div className="mb-2 font-bold">{t.order.ship}</div>
          <div>{order.zoneName}</div>
          <div className="text-xs text-mute">{t.cart.weight} {fmtNum(order.totalWeightKg)} kg・{t.cart.volume} {fmtNum(order.totalCbm)} CBM</div>
          {order.trackingNo && <div>{t.order.tracking}：{order.trackingNo}</div>}
          <div className="border-t border-line pt-3 text-mute">
            <div className="text-ink">{order.contactName}　{order.contactPhone}</div>
            <div>{order.contactEmail}</div>
            {order.company && <div>{order.company}{order.taxId && `（${order.taxId}）`}</div>}
            <div>{[order.address, order.city, order.region, order.postcode].filter(Boolean).join(order.country === "TW" ? " " : ", ")}</div>
            {order.note && <div className="mt-2 whitespace-pre-line">「{order.note}」</div>}
          </div>
        </div>
        <div className="text-xs text-mute">{t.order.date}：{fmtDate(order.createdAt)}　{order.currency}</div>
      </aside>
    </div>
  );
}
