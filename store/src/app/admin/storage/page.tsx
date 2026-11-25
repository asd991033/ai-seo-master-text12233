import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { UPLOAD_KEEP_DAYS, cleanupOrphanUploads, diskUsage } from "@/lib/cleanup-uploads";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  "files/uploads": "客戶在排版時上傳的圖片", "files/designs": "已儲存的設計（印刷檔、示意圖）", "files/artwork": "客戶上傳的現成稿件",
  backups: "資料庫備份", "store.db": "資料庫",
};

async function deleteUnused() {
  "use server";
  await requireAdmin();
  let msg: string;
  try {
    const r = await cleanupOrphanUploads();
    msg = r.deleted ? `已刪除 ${r.deleted} 個沒用到的上傳圖，釋出 ${r.freedMb} MB` : "沒有可以刪除的檔案";
  } catch {
    msg = "清理失敗，沒有刪除任何檔案";
  }
  redirect(`/admin/storage?msg=${encodeURIComponent(msg)}`);
}

export default async function AdminStorage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const [disk, unused] = await Promise.all([diskUsage(), cleanupOrphanUploads({ dryRun: true }).catch(() => null)]);
  const usedPct = disk.totalMb > 0 ? Math.round(((disk.totalMb - disk.freeMb) / disk.totalMb) * 100) : 0;
  const low = disk.freeMb < Math.max(50, disk.totalMb * 0.1);
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">儲存空間</h1>
      <p className="mb-6 text-sm text-mute">資料磁碟存放資料庫、客戶上傳的圖片與設計檔。空間滿了客戶就無法上傳圖片，下單也可能失敗。</p>
      {sp.msg && <p className="mb-6 rounded-lg bg-sand p-3 text-sm" role="status">{sp.msg}</p>}

      <section className="card mb-6 p-6 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">磁碟用量</h2>
          <span className={low ? "font-bold text-danger" : "text-mute"}>剩餘 {disk.freeMb} MB／共 {disk.totalMb} MB（已用 {usedPct}%）</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand" role="img" aria-label={`已使用 ${usedPct}%`}>
          <div className={`h-full ${low ? "bg-danger" : "bg-forest"}`} style={{ width: `${usedPct}%` }} />
        </div>
        {low && <p className="mt-3 text-danger">空間快滿了。請到 Railway 把 web-volume 的容量調大，或先清除下方沒用到的上傳圖。</p>}
        <ul className="mt-4 divide-y divide-line">
          {disk.parts.map((x) => (
            <li key={x.name} className="flex justify-between gap-4 py-2"><span>{LABEL[x.name] ?? x.name}</span><span className="tabular-nums text-mute">{x.mb} MB</span></li>
          ))}
        </ul>
      </section>

      <section className="card p-6 text-sm">
        <h2 className="text-lg font-bold">沒用到的上傳圖</h2>
        <p className="mt-1 leading-relaxed text-mute">客戶在排版時上傳、但最後沒有存成設計的圖片。只會列入上傳超過 {UPLOAD_KEEP_DAYS} 天、而且沒有被任何已儲存的設計或訂單用到的檔案；已經用在設計或訂單裡的圖片不會被刪。刪除後無法復原。</p>
        {unused === null ? <p className="mt-4 text-danger">目前無法計算，請稍後再試。</p> : unused.deleted === 0 ? <p className="mt-4">目前沒有可以刪除的檔案（保留中的上傳圖 {unused.kept} 個）。</p> : (
          <form action={deleteUnused} className="mt-4 flex flex-wrap items-center gap-4">
            <span>可刪除 <strong>{unused.deleted}</strong> 個檔案，約 <strong>{unused.freedMb} MB</strong>（保留 {unused.kept} 個）</span>
            <button className="btn-ghost py-1.5 text-danger">刪除這 {unused.deleted} 個檔案</button>
          </form>
        )}
      </section>
    </>
  );
}
