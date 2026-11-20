import { asc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { fmtMoney } from "@/lib/format";
import { getPricingSettings } from "@/lib/settings";
import { saveMargin } from "../actions";

export default async function AdminPricing() {
  const [{ margin: rate, fx }, rows] = await Promise.all([
    getPricingSettings(),
    db.select({ sku: schema.products.sku, name: schema.products.name, minQty: schema.priceTiers.minQty, unitCost: schema.priceTiers.unitCost, costCurrency: schema.priceTiers.costCurrency, unitPrice: schema.priceTiers.unitPrice })
      .from(schema.priceTiers).innerJoin(schema.products, eq(schema.products.id, schema.priceTiers.productId))
      .where(isNotNull(schema.priceTiers.unitCost)).orderBy(asc(schema.products.sku), asc(schema.priceTiers.minQty)).limit(500),
  ]);
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">定價設定</h1>
      <p className="mb-6 text-sm text-mute">售價 = 成本價 × 匯率 ÷ (1 − 毛利率)，無條件進位到整數。例：成本 100、毛利率 60% → 售價 250。成本價只在後台顯示。</p>
      <form action={saveMargin} className="card flex flex-wrap items-end gap-4 p-5">
        <label><span className="label">毛利率 (%)</span><input name="marginPct" type="number" min={0} max={99} step="0.1" defaultValue={Math.round(rate * 1000) / 10} required className="input w-32 text-lg font-bold" /></label>
        <label><span className="label">人民幣匯率（1 CNY = ? TWD）</span><input name="fxCNY" type="number" min={0.01} step="0.001" defaultValue={fx("CNY")} required className="input w-40 text-lg font-bold" /></label>
        <button className="btn-primary">儲存並重新計算全部售價</button>
        <span className="pb-2 text-xs text-mute">只會重算有填成本價的級距；直接填售價的不受影響。</span>
      </form>
      <h2 className="mt-10 mb-3 text-lg font-bold">成本與售價（{rows.length} 筆）</h2>
      {rows.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-mute"><tr>{["SKU", "品名", "起始數量", "成本價", "售價", "實際毛利率"].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={`${r.sku}-${r.minQty}`}>
                  <td className="p-3 text-xs text-mute">{r.sku}</td><td className="p-3">{r.name}</td><td className="p-3 tabular-nums">{r.minQty}</td>
                  <td className="p-3 tabular-nums">{r.costCurrency ? `${r.costCurrency} ${r.unitCost}` : fmtMoney(r.unitCost!)}</td><td className="p-3 font-medium tabular-nums">{fmtMoney(r.unitPrice)}</td>
                  <td className="p-3 tabular-nums">{r.unitPrice > 0 ? `${(((r.unitPrice - r.unitCost! * fx(r.costCurrency)) / r.unitPrice) * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-mute">尚未匯入含成本價的產品。在 Excel「區間價格」工作表填「成本價」欄即可。</p>}
    </>
  );
}
