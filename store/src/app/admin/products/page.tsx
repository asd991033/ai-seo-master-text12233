import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { fmtMoney } from "@/lib/format";
import { toggleProduct } from "../actions";

export default async function AdminProducts() {
  const rows = await db
    .select({
      p: schema.products,
      minPrice: sql<number | null>`(select min(unit_price) from price_tiers where product_id = ${schema.products.id})`,
      maxPrice: sql<number | null>`(select max(unit_price) from price_tiers where product_id = ${schema.products.id})`,
      positions: sql<number>`(select count(*) from print_positions where product_id = ${schema.products.id})`,
      noDieline: sql<number>`(select count(*) from print_positions where product_id = ${schema.products.id} and dieline_url is null)`,
      printPrices: sql<number>`(select count(*) from print_prices where product_id = ${schema.products.id})`,
    })
    .from(schema.products)
    .orderBy(asc(schema.products.sku));
  return (
    <>
      <div className="mb-5 flex items-center gap-4">
        <h1 className="text-2xl font-bold">產品（{rows.length}）</h1>
        <Link href="/admin/import" className="btn-primary ml-auto">批量匯入</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-mute">
            <tr>{["", "SKU / 品名", "區間價", "MOQ", "重量", "印刷位置", "印刷報價", "精選", "上架"].map((h) => <th key={h} className="p-3 font-medium whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ p, minPrice, maxPrice, positions, noDieline, printPrices }) => (
              <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                <td className="p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.images[0] && <img src={p.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                </td>
                <td className="p-3"><Link href={`/products/${p.slug}`} className="font-medium hover:text-forest">{p.name}</Link><div className="text-xs text-mute">{p.sku}</div></td>
                <td className="p-3 whitespace-nowrap tabular-nums">{minPrice == null ? <span className="text-danger">未設定</span> : `${fmtMoney(minPrice)} ~ ${fmtMoney(maxPrice ?? minPrice)}`}</td>
                <td className="p-3 tabular-nums">{p.moq}</td>
                <td className="p-3 whitespace-nowrap tabular-nums">{p.unitWeightG ? `${p.unitWeightG} g` : <span className="text-danger">未設定</span>}</td>
                <td className="p-3 whitespace-nowrap">{positions}{noDieline > 0 && <span className="ml-1 text-xs text-danger">（{noDieline} 缺刀模）</span>}</td>
                <td className="p-3 tabular-nums">{printPrices}</td>
                {(["featured", "active"] as const).map((f) => (
                  <td key={f} className="p-3">
                    <form action={toggleProduct}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="field" value={f} />
                      <button className={p[f] ? "chip-on px-2.5 py-0.5 text-xs" : "chip px-2.5 py-0.5 text-xs"}>{p[f] ? "是" : "否"}</button>
                    </form>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
