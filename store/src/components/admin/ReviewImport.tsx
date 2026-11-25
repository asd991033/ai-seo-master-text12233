"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Res = { ok: boolean; imported?: number; errors: string[] };

export function ReviewImport() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch("/api/admin/reviews/import", { method: "POST", body: new FormData(e.currentTarget) });
      setRes(await r.json());
      router.refresh();
    } catch {
      setRes({ ok: false, errors: ["上傳失敗，請重試"] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <h2 className="text-lg font-bold">Excel 批量匯入</h2>
      <p className="text-sm leading-relaxed text-mute">每一列是一則評價，填 <strong className="text-ink">SKU</strong>、評價者名稱、星等與內容即可匯入並直接公開。匯入的評價一律標示「已驗證購買」，請只匯入真實買家的評價。訂單編號選填，有填會核對本站訂單。只要有一列有問題，整個檔案都不會匯入。</p>
      <a href="/api/admin/reviews/template" className="btn-ghost">下載 Excel 範本</a>
      <input type="file" name="file" accept=".xlsx,.xlsm,.csv,.xls" required className="input" />
      <button className="btn-primary" disabled={busy}>{busy ? "匯入中…" : "開始匯入"}</button>
      {res?.ok && <p className="rounded-lg bg-forest/10 p-3 text-sm text-forest" role="status">匯入成功：{res.imported} 則評價</p>}
      {res && !res.ok && (
        <ul className="max-h-64 list-disc space-y-1 overflow-auto rounded-lg bg-danger/10 p-3 pl-7 text-sm text-danger" role="alert">
          {res.errors.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      )}
    </form>
  );
}
