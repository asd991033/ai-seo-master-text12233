import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { site } from "@/config/site";
import { addZone, saveZoneRates } from "../actions";

type Rate = typeof schema.shippingRates.$inferSelect;
const COLS = ["方式", "起始計費量", "單價", "基本費", "最低收費", "最快(天)", "最慢(天)"];

function RateRow({ r, mode }: { r?: Rate; mode: "air" | "sea" }) {
  const cell = "input px-2 py-1";
  return (
    <tr>
      <td className="p-1">
        <select name="mode" defaultValue={r?.mode ?? mode} className={cell}><option value="air">空運 (kg)</option><option value="sea">海運 (CBM)</option></select>
      </td>
      {(["minUnits", "rate", "baseFee", "minCharge", "daysMin", "daysMax"] as const).map((k) => (
        <td key={k} className="p-1"><input name={k} type="number" step="any" min={0} defaultValue={r?.[k] ?? ""} placeholder={r ? undefined : "新增一列"} className={cell} /></td>
      ))}
    </tr>
  );
}

export default async function AdminShipping() {
  const [zones, rates] = await Promise.all([
    db.select().from(schema.shippingZones).orderBy(asc(schema.shippingZones.sort), asc(schema.shippingZones.id)),
    db.select().from(schema.shippingRates).orderBy(asc(schema.shippingRates.mode), asc(schema.shippingRates.minUnits)),
  ]);
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">運費設定</h1>
      <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-mute">
        <li>空運：計費重 = 實重與材積重（長×寬×高÷6000）取大，進位至 0.5 kg；運費 = max(最低收費, 基本費 + 計費重 × 單價)。單價為每公斤 {site.currency}。</li>
        <li>海運：計費體積 = 體積 (CBM) 與重量噸取大；運費 = max(最低收費, 基本費 + 計費體積 × 單價)。單價為每 CBM {site.currency}。</li>
        <li>「起始計費量」是級距門檻（空運 kg／海運 CBM），達到門檻即套用該列單價。單價留空的列會被刪除。</li>
      </ul>
      <div className="space-y-6">
        {zones.map((z) => {
          const mine = rates.filter((r) => r.zoneId === z.id);
          return (
            <form key={z.id} action={saveZoneRates} className="card p-4">
              <input type="hidden" name="zoneId" value={z.id} />
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="rounded bg-sand px-2 py-1 text-xs font-medium">{z.code}</span>
                <input name="name" defaultValue={z.name} required aria-label="區域名稱" className="input w-56 font-medium" />
                <button className="btn-primary ml-auto py-1.5">儲存 {z.name}</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr>{COLS.map((h) => <th key={h} className="p-1 text-left text-xs font-medium text-mute">{h}</th>)}</tr></thead>
                  <tbody>
                    {mine.map((r) => <RateRow key={r.id} r={r} mode={r.mode} />)}
                    <RateRow mode="air" />
                    <RateRow mode="sea" />
                  </tbody>
                </table>
              </div>
            </form>
          );
        })}
      </div>
      <form action={addZone} className="card mt-8 flex flex-wrap items-end gap-3 p-4 text-sm">
        <label><span className="label">新區域代碼</span><input name="code" required placeholder="例：MY" className="input w-32" /></label>
        <label><span className="label">名稱</span><input name="name" required placeholder="例：馬來西亞" className="input" /></label>
        <button className="btn-ghost">新增運送區域</button>
      </form>
    </>
  );
}
