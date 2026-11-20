import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { saveMethod } from "../actions";

type Method = typeof schema.printMethods.$inferSelect;

function MethodForm({ m }: { m?: Method }) {
  return (
    <form action={saveMethod} className="card grid items-end gap-3 p-4 text-sm md:grid-cols-[120px_180px_1fr_auto_80px_70px_auto]">
      <label><span className="label">代碼</span><input name="code" defaultValue={m?.code} readOnly={!!m} required pattern="[a-z0-9_\-]+" className={`input ${m ? "bg-sand" : ""}`} /></label>
      <label><span className="label">名稱</span><input name="name" defaultValue={m?.name} required className="input" /></label>
      <label><span className="label">說明</span><input name="description" defaultValue={m?.description} className="input" /></label>
      <label className="flex items-center gap-2 pb-2 whitespace-nowrap"><input type="checkbox" name="perColor" defaultChecked={m?.perColor} className="accent-[var(--color-forest)]" />依色數計價</label>
      <label><span className="label">最多色數</span><input name="maxColors" type="number" min={1} defaultValue={m?.maxColors ?? 1} className="input" /></label>
      <label><span className="label">排序</span><input name="sort" type="number" defaultValue={m?.sort ?? 99} className="input" /></label>
      <button className={m ? "btn-ghost" : "btn-primary"}>{m ? "儲存" : "新增"}</button>
    </form>
  );
}

export default async function AdminMethods() {
  const methods = await db.select().from(schema.printMethods).orderBy(asc(schema.printMethods.sort), asc(schema.printMethods.id));
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">印刷方式</h1>
      <p className="mb-6 text-sm text-mute">「代碼」用於 Excel「印刷報價」工作表。勾選「依色數計價」時，報價單價與版費會乘上客戶選擇的色數。</p>
      <div className="space-y-3">{methods.map((m) => <MethodForm key={m.id} m={m} />)}</div>
      <h2 className="mt-10 mb-3 text-lg font-bold">新增印刷方式</h2>
      <MethodForm />
    </>
  );
}
