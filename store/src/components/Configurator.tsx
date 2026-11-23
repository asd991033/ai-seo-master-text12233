"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/i18n";
import { fmtMoney, fmtNum } from "@/lib/format";
import { pickTier, quoteLine, QuoteError, tiersFor, variantKey, type LineQuote, type PrintSelection, type ProductPricing } from "@/lib/pricing";
import { flatShipping, packItems, quoteAllModes, type RateRow, type ShipItem } from "@/lib/shipping";
import { saveDraft, useCart } from "@/lib/cart";
import { site } from "@/config/site";

export type ConfigProduct = {
  id: number;
  slug: string;
  sku: string;
  name: string;
  image: string | null;
  colors: { name: string; hex: string; image?: string; display?: string }[];
  sizes: string[];
  /** 滿版印刷：整面都由客戶的設計決定，沒有底色可選 */
  fullPrint: boolean;
  pricing: ProductPricing;
  positions: { code: string; name: string; areas: { code: string; name: string }[] }[];
  ship: Omit<ShipItem, "qty">;
  zones: { code: string; name: string; rates: RateRow[] }[];
};

/** 供應商有時把款式放在顏色欄位，用名稱判斷是不是真的顏色 */
const isColorName = (name: string) => /[色白黑紅藍綠黃灰粉紫橙棕金銀青]|卡其|透明|米|咖啡|彩|迷彩/.test(name);

type PosState = { on: boolean; areaCode: string; methodCode: string; colors: number };

export function Configurator({ p }: { p: ConfigProduct }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [color, setColor] = useState((p.colors.find((c) => (c.display ?? c.image) === p.image) ?? p.colors[0])?.name ?? null);
  const [size, setSize] = useState(p.sizes[0] ?? null);
  const [qtyText, setQtyText] = useState(String(p.pricing.moq));
  const [zoneCode, setZoneCode] = useState(p.zones.find((z) => z.code === site.defaultZone)?.code ?? p.zones[0]?.code ?? "");
  const [artwork, setArtwork] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /** 選項全都不是顏色名稱時（例如「無帽繩」），當成款式顯示 */
  const styleOnly = p.colors.length > 0 && p.colors.every((c) => !isColorName(c.name));
  const pickColor = (c: { name: string; image?: string; display?: string }) => {
    setColor(c.name);
    const src = c.display ?? c.image;
    if (src) window.dispatchEvent(new CustomEvent("product-image", { detail: src }));
  };

  const methodsFor = (pos: string, area: string) => {
    const codes = new Set(p.pricing.printPrices.filter((r) => r.positionCode === pos && r.areaCode === area).map((r) => r.methodCode));
    return p.pricing.methods.filter((m) => codes.has(m.code));
  };

  const [posState, setPosState] = useState<Record<string, PosState>>(() =>
    Object.fromEntries(
      p.positions.map((pos) => {
        const areaCode = pos.areas[0].code;
        return [pos.code, { on: false, areaCode, methodCode: methodsFor(pos.code, areaCode)[0]?.code ?? "", colors: 1 }];
      }),
    ),
  );
  const patch = (code: string, v: Partial<PosState>) =>
    setPosState((s) => {
      const next = { ...s[code], ...v };
      const ms = methodsFor(code, next.areaCode);
      if (!ms.some((m) => m.code === next.methodCode)) next.methodCode = ms[0]?.code ?? "";
      const max = ms.find((m) => m.code === next.methodCode)?.maxColors ?? 1;
      next.colors = Math.min(Math.max(1, next.colors), max);
      return { ...s, [code]: next };
    });

  const qty = Number(qtyText);
  const variant = variantKey(color, size);
  const tiers = tiersFor(p.pricing, variant);
  const prints: PrintSelection[] = p.positions
    .filter((pos) => posState[pos.code].on && posState[pos.code].methodCode)
    .map((pos) => ({ positionCode: pos.code, areaCode: posState[pos.code].areaCode, methodCode: posState[pos.code].methodCode, colors: posState[pos.code].colors }));

  const { quote, error } = useMemo((): { quote: LineQuote | null; error: string | null } => {
    try {
      return { quote: quoteLine(p.pricing, qty, prints, variant), error: null };
    } catch (e) {
      return { quote: null, error: e instanceof QuoteError ? e.message : String(e) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty, JSON.stringify(prints), variant]);

  const activeTier = pickTier(tiers, qty);
  const nextTier = tiers.find((x) => x.minQty > qty);
  const zone = p.zones.find((z) => z.code === zoneCode);
  const pack = quote ? packItems([{ ...p.ship, qty }]) : null;
  const shipQuotes = zone && pack && quote ? flatShipping(site.flatShipping, quote.goodsTotal + quote.printTotal + quote.setupTotal) ?? quoteAllModes(zone.rates, pack) : [];

  const label = (s: PrintSelection) => {
    const pos = p.positions.find((x) => x.code === s.positionCode);
    const method = p.pricing.methods.find((m) => m.code === s.methodCode);
    return `${pos?.name}｜${pos?.areas.find((a) => a.code === s.areaCode)?.name}｜${method?.name}${method?.perColor ? ` ${s.colors} ${t.product.colorsUnit}` : ""}`;
  };

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.set("kind", "artwork");
      fd.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setArtwork({ url: json.url, name: file.name });
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function addToCart(next: "/cart" | "/checkout") {
    if (!quote) return;
    add({ productId: p.id, slug: p.slug, sku: p.sku, name: p.name, image: p.image, colorName: color, sizeName: size, qty, prints, artworkUrl: artwork?.url, artworkName: artwork?.name });
    router.push(next);
  }

  function goDesign() {
    if (!quote) return;
    // 還沒選印刷位置時，自動帶入第一個位置，少一個步驟
    let chosen = prints;
    if (!chosen.length) {
      const first = p.positions[0], st = first && posState[first.code];
      if (!first || !st?.methodCode) return setNotice(t.product.needPrint);
      chosen = [{ positionCode: first.code, areaCode: st.areaCode, methodCode: st.methodCode, colors: st.colors }];
    }
    saveDraft({ slug: p.slug, qty, colorName: color, sizeName: size, prints: chosen });
    router.push(`/design/${p.slug}`);
  }

  return (
    <div className="space-y-6">
      {p.fullPrint && (
        <div className="rounded-xl border border-gold/40 bg-gold/5 p-4" data-testid="full-print">
          <div className="text-sm font-bold text-gold">{t.product.fullPrint}</div>
          <p className="mt-1 text-sm leading-relaxed text-mute">{t.product.fullPrintDesc}</p>
          {p.colors.length === 1 && isColorName(p.colors[0].name) && (
            <p className="mt-2 flex items-center gap-2 text-xs text-mute">
              <span className="h-3.5 w-3.5 rounded-full border border-line" style={{ background: p.colors[0].hex }} />
              {t.product.trimColor}：{p.colors[0].name}
            </p>
          )}
        </div>
      )}
      {p.colors.length === 1 && !isColorName(p.colors[0].name) && (
        <div className="text-sm"><span className="text-mute">{t.product.style}：</span>{p.colors[0].name}</div>
      )}
      {p.colors.length === 1 && !p.fullPrint && isColorName(p.colors[0].name) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-mute">{t.product.color}：</span>
          <span className="h-4 w-4 rounded-full border border-line" style={{ background: p.colors[0].hex }} />
          {p.colors[0].name}
        </div>
      )}
      {p.colors.length > 1 && (
        <div>
          <div className="label">{styleOnly ? t.product.style : t.product.color}：<span className="text-ink">{color}</span></div>
          <div className="flex flex-wrap gap-2">
            {p.colors.map((c) =>
              styleOnly ? (
                <button key={c.name} type="button" aria-pressed={color === c.name} onClick={() => pickColor(c)} className={color === c.name ? "chip-on" : "chip"}>{c.name}</button>
              ) : (
                <button key={c.name} type="button" title={c.name} aria-label={c.name} aria-pressed={color === c.name} onClick={() => pickColor(c)}
                  className={`h-9 w-9 rounded-full border-2 ${color === c.name ? "border-forest ring-2 ring-forest/30" : "border-line"}`} style={{ background: c.hex }} />
              ),
            )}
          </div>
        </div>
      )}

      {p.sizes.length > 1 && (
        <div>
          <div className="label">{t.product.sizePick}</div>
          <div className="flex flex-wrap gap-2">
            {p.sizes.map((s) => (
              <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)} className={size === s ? "chip-on" : "chip"}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="label">{t.product.tierTitle}{p.pricing.variants && <span className="ml-2 font-normal text-gold">{t.product.variantNote}</span>}</div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {tiers.map((tier) => (
            <button key={tier.minQty} type="button" onClick={() => setQtyText(String(tier.minQty))}
              className={`rounded-xl border px-2 py-2 text-center transition ${activeTier?.minQty === tier.minQty ? "border-forest bg-forest text-white" : "border-line bg-white hover:border-ink"}`}>
              <div className="text-xs opacity-80">{fmtNum(tier.minQty)}+</div>
              <div className="font-bold">{fmtMoney(tier.unitPrice)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="w-36">
          <label className="label" htmlFor="qty">{t.product.qty}</label>
          <input id="qty" type="number" inputMode="numeric" min={p.pricing.moq} step={1} value={qtyText} onChange={(e) => setQtyText(e.target.value)} className="input text-base font-bold" />
        </div>
        {quote && nextTier && (
          <button type="button" onClick={() => setQtyText(String(nextTier.minQty))} className="pb-2 text-left text-xs text-gold hover:underline">
            {t.product.nextTier(nextTier.minQty - qty, fmtMoney(nextTier.unitPrice))}
          </button>
        )}
      </div>

      {p.positions.length > 0 && (
        <div>
          <div className="label">{t.product.printTitle}</div>
          {p.pricing.extraFacePrice ? <p className="mb-2 text-xs text-gold" data-testid="extra-face-note">{t.product.extraFaceNote(fmtMoney(p.pricing.extraFacePrice))}</p> : p.positions.length > 1 ? <p className="mb-2 text-xs text-mute">{t.product.allFacesIncluded}</p> : null}
          <div className="space-y-3">
            {p.positions.map((pos) => {
              const st = posState[pos.code];
              const methods = methodsFor(pos.code, st.areaCode);
              const method = methods.find((m) => m.code === st.methodCode);
              return (
                <div key={pos.code} className={`card p-4 ${st.on ? "border-forest" : ""}`}>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={st.on} onChange={(e) => patch(pos.code, { on: e.target.checked })} className="h-4 w-4 accent-[var(--color-forest)]" />
                    <span className="font-medium">{pos.name}</span>
                    {!st.on && <span className="text-xs text-mute">{t.product.printNone}</span>}
                  </label>
                  {st.on && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="label">{t.product.area}</div>
                        <div className="flex flex-wrap gap-2">
                          {pos.areas.map((a) => (
                            <button key={a.code} type="button" onClick={() => patch(pos.code, { areaCode: a.code })} className={st.areaCode === a.code ? "chip-on" : "chip"}>{a.name}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="label">{t.product.method}</div>
                        <div className="flex flex-wrap gap-2">
                          {methods.map((m) => (
                            <button key={m.code} type="button" onClick={() => patch(pos.code, { methodCode: m.code })} className={st.methodCode === m.code ? "chip-on" : "chip"}>{m.name}</button>
                          ))}
                        </div>
                      </div>
                      {method?.perColor && (
                        <div>
                          <div className="label">{t.product.colors}</div>
                          <div className="flex gap-2">
                            {Array.from({ length: method.maxColors }, (_, i) => i + 1).map((n) => (
                              <button key={n} type="button" onClick={() => patch(pos.code, { colors: n })} className={st.colors === n ? "chip-on" : "chip"}>{n} {t.product.colorsUnit}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card bg-sand p-5">
        <div className="mb-3 font-bold">{t.product.quoteTitle}</div>
        {quote ? (
          <dl className="space-y-2 text-sm">
            <Row k={`${t.product.goods} ${fmtMoney(quote.baseUnitPrice)} × ${fmtNum(quote.qty)}`} v={fmtMoney(quote.goodsTotal)} />
            {quote.prints.map((x) => (
              <div key={x.positionCode}>
                <Row k={x.total > 0 ? `${label(x)}　${fmtMoney(x.unitPrice)} × ${fmtNum(quote.qty)}` : label(x)} v={x.total > 0 ? fmtMoney(x.total) : t.product.included} />
                {x.setupFee > 0 && <Row k={`　${t.product.setup}`} v={fmtMoney(x.setupFee)} muted />}
              </div>
            ))}
            {quote.extraFaceTotal > 0 && <Row k={`${t.product.extraFace(quote.extraFaces)}　${fmtMoney(quote.extraFaceUnit * quote.extraFaces)} × ${fmtNum(quote.qty)}`} v={fmtMoney(quote.extraFaceTotal)} />}
            <div className="flex items-end justify-between border-t border-line pt-3">
              <dt>
                <div className="text-xs text-mute">{t.product.subtotal}</div>
                <div className="text-xs text-mute">{t.product.unitAllIn} {fmtMoney(quote.unitAllIn)}</div>
              </dt>
              <dd className="serif text-2xl font-bold text-forest" data-testid="quote-total">{fmtMoney(quote.total)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-danger" role="alert">{error}</p>
        )}
      </div>

      {p.zones.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="font-bold">{t.product.shipTitle}</div>
            <label className="flex items-center gap-2 text-sm text-mute">
              {t.product.shipTo}
              <select value={zoneCode} onChange={(e) => setZoneCode(e.target.value)} className="input w-auto py-1">
                {p.zones.map((z) => <option key={z.code} value={z.code}>{z.name}</option>)}
              </select>
            </label>
          </div>
          {pack && shipQuotes[0]?.flat ? (
            <div className="flex items-baseline justify-between rounded-xl border border-line p-3" data-testid="flat-ship">
              <span className="text-sm text-mute">{t.cart.flatShipNote}</span>
              <span className="font-bold text-forest">{shipQuotes[0].fee > 0 ? fmtMoney(shipQuotes[0].fee) : t.cart.freeShip}</span>
            </div>
          ) : pack && shipQuotes.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {shipQuotes.map((s) => (
                  <div key={s.mode} className="rounded-xl border border-line p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium">{s.mode === "air" ? t.product.air : t.product.sea}</span>
                      <span className="font-bold text-forest">{fmtMoney(s.fee)}</span>
                    </div>
                    <div className="mt-1 text-xs text-mute">
                      {t.product.eta} {s.daysMin}–{s.daysMax} {t.product.etaDays}・{s.unit === "kg" ? `${t.product.chargeableKg} ${fmtNum(s.chargeable)} kg` : `${t.product.chargeableCbm} ${fmtNum(s.chargeable)} CBM`}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-mute">{t.product.grossWeight} {fmtNum(pack.weightKg)} kg{pack.cartons > 0 && `・${t.product.cartons} ${pack.cartons}`}</div>
            </>
          ) : (
            <p className="text-sm text-mute">{quote ? t.product.noShip : "—"}</p>
          )}
        </div>
      )}

      {/* 手機底部固定的下單列 */}
      <div className="no-print fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-mute">{t.product.subtotal}</div>
          <div className="serif truncate text-lg font-bold text-forest">{quote ? fmtMoney(quote.total) : "—"}</div>
        </div>
        {p.positions.length > 0 ? (
          <button type="button" onClick={goDesign} disabled={!quote} className="btn-primary px-6 py-3">{t.product.design}</button>
        ) : (
          <button type="button" onClick={() => addToCart("/checkout")} disabled={!quote} className="btn-primary px-6 py-3">{t.product.buyNow}</button>
        )}
      </div>

      <div className="space-y-3">
        {p.positions.length > 0 && (
          <button type="button" onClick={goDesign} disabled={!quote} className="btn-primary w-full py-3.5 text-base">
            {t.product.design}
            <span className="hidden text-xs font-normal opacity-80 sm:inline">— {t.product.designHint}</span>
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => addToCart("/cart")} disabled={!quote || uploading} className="btn-outline py-3">{t.product.addToCart}</button>
          <button type="button" onClick={() => addToCart("/checkout")} disabled={!quote || uploading} className={`${p.positions.length ? "btn-outline" : "btn-primary"} py-3`} data-testid="buy-now">{t.product.buyNow}</button>
        </div>
        {prints.length > 0 && !artwork && <p className="text-center text-xs text-mute">{t.product.addLater}</p>}
        {prints.length > 0 && (
          <label className="block cursor-pointer rounded-xl border border-dashed border-line p-3 text-center text-sm hover:border-ink">
            <input type="file" className="sr-only" accept=".ai,.pdf,.eps,.psd,.png,.jpg,.jpeg,.svg,.zip" onChange={(e) => onUpload(e.target.files?.[0])} />
            {uploading ? t.product.uploading : artwork ? `✓ ${t.product.artworkUploaded}：${artwork.name}` : t.product.artwork}
            <div className="mt-1 text-xs text-mute">{t.product.artworkHint}</div>
          </label>
        )}
        {notice && <p className="text-sm text-danger" role="alert">{notice}</p>}
      </div>
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${muted ? "text-mute" : ""}`}>
      <dt>{k}</dt>
      <dd className="shrink-0 tabular-nums">{v}</dd>
    </div>
  );
}
