"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ImportRes = { ok: boolean; errors: string[]; counts?: { products: number; tiers: number; areas: number; printPrices: number } };
type AssetRes = { results: { file: string; ok: boolean; message: string }[] };

export function ImportPanel() {
  const router = useRouter();
  const [busy, setBusy] = useState<"data" | "assets" | null>(null);
  const [dataRes, setDataRes] = useState<ImportRes | null>(null);
  const [assetRes, setAssetRes] = useState<AssetRes | null>(null);

  async function post<T>(url: string, fd: FormData): Promise<T> {
    const res = await fetch(url, { method: "POST", body: fd });
    return res.json();
  }

  async function onData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("data");
    setDataRes(null);
    try {
      setDataRes(await post<ImportRes>("/api/admin/import", new FormData(e.currentTarget)));
      router.refresh();
    } catch {
      setDataRes({ ok: false, errors: ["上傳失敗，請重試"] });
    } finally {
      setBusy(null);
    }
  }

  async function onAssets(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("assets");
    setAssetRes(null);
    const input = e.currentTarget.elements.namedItem("files") as HTMLInputElement;
    const all = Array.from(input.files ?? []);
    const results: AssetRes["results"] = [];
    try {
      // 分批上傳，避免單次請求過大
      for (let i = 0; i < all.length; i += 10) {
        const fd = new FormData();
        all.slice(i, i + 10).forEach((f) => fd.append("files", f));
        results.push(...(await post<AssetRes>("/api/admin/assets", fd)).results);
        setAssetRes({ results: [...results] });
      }
      router.refresh();
    } catch {
      setAssetRes({ results: [...results, { file: "—", ok: false, message: "上傳中斷，請重試" }] });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={onData} className="card space-y-4 p-6">
        <h2 className="text-lg font-bold">① 匯入產品資料（Excel）</h2>
        <p className="text-sm leading-relaxed text-mute">一個 .xlsx 檔包含四張工作表：產品、區間價格、印刷區域、印刷報價。以 SKU 為準，重複匯入會更新既有資料。</p>
        <a href="/api/admin/template" className="btn-ghost">下載 Excel 範本</a>
        <input type="file" name="file" accept=".xlsx" required className="input" />
        <button className="btn-primary" disabled={busy !== null}>{busy === "data" ? "匯入中…" : "開始匯入"}</button>
        {dataRes?.ok && dataRes.counts && (
          <p className="rounded-lg bg-forest/10 p-3 text-sm text-forest" role="status">匯入成功：產品 {dataRes.counts.products}、區間價格 {dataRes.counts.tiers}、印刷面積 {dataRes.counts.areas}、印刷報價 {dataRes.counts.printPrices} 筆</p>
        )}
        {dataRes && !dataRes.ok && (
          <ul className="max-h-64 list-disc space-y-1 overflow-auto rounded-lg bg-danger/10 p-3 pl-7 text-sm text-danger" role="alert">
            {dataRes.errors.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        )}
      </form>

      <form onSubmit={onAssets} className="card space-y-4 p-6">
        <h2 className="text-lg font-bold">② 上傳刀模 / 示意圖 / 商品圖</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-mute">
          <li>刀模：<code>{"{SKU}_{位置代碼}.svg"}</code></li>
          <li>示意圖：<code>{"{SKU}_{位置代碼}_mockup.png"}</code></li>
          <li>商品圖：<code>{"{SKU}_1.jpg"}</code>、<code>{"{SKU}_2.jpg"}</code>…</li>
        </ul>
        <p className="text-sm text-mute">可一次選取多個檔案，系統依檔名自動對應（請先完成 ① 的資料匯入）。</p>
        <input type="file" name="files" multiple required accept=".svg,.png,.jpg,.jpeg,.webp" className="input" />
        <button className="btn-primary" disabled={busy !== null}>{busy === "assets" ? "上傳中…" : "開始上傳"}</button>
        {assetRes && (
          <ul className="max-h-64 space-y-1 overflow-auto text-sm" role="status">
            {assetRes.results.map((r, i) => (
              <li key={i} className={r.ok ? "text-forest" : "text-danger"}>{r.ok ? "✓" : "✗"} {r.file} — {r.message}</li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
}
