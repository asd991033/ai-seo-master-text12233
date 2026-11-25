import "server-only";
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/db";

const DIR = path.join(path.resolve(process.env.STORAGE_DIR ?? "./data/files"), "uploads");
/** 上傳超過這個天數、又沒有被任何資料用到的圖片才會刪（排版中的畫面關掉就沒了，不會有放好幾天才存的情況） */
const KEEP_DAYS = Math.max(1, Number(process.env.UPLOAD_CLEANUP_DAYS ?? "2") || 2);

/** 資料庫裡所有文字欄位提到的上傳檔名（已儲存的設計、訂單明細…任何地方只要提到就算用到） */
async function referencedUploads(): Promise<Set<string>> {
  const used = new Set<string>();
  const tables = (await db.all(sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)) as { name: string }[];
  for (const { name } of tables) {
    const table = `"${name.replace(/"/g, "")}"`;
    const cols = (await db.all(sql.raw(`PRAGMA table_info(${table})`))) as { name: string }[];
    for (const c of cols) {
      const col = `"${c.name.replace(/"/g, "")}"`;
      const rows = (await db.all(sql.raw(`SELECT ${col} AS v FROM ${table} WHERE typeof(${col}) IN ('text','blob') AND CAST(${col} AS TEXT) LIKE '%uploads%'`))) as { v: unknown }[];
      for (const r of rows) {
        const text = typeof r.v === "string" ? r.v : Buffer.isBuffer(r.v) ? r.v.toString("utf8") : String(r.v ?? "");
        // JSON 裡的斜線可能被跳脫成 \/，檔名也可能經過網址編碼
        for (const m of text.matchAll(/uploads(?:\\?\/|%2F)([A-Za-z0-9._%-]+)/gi)) {
          used.add(m[1]);
          try { used.add(decodeURIComponent(m[1])); } catch { /* 不是合法的編碼就用原字串 */ }
        }
      }
    }
  }
  return used;
}

/**
 * 找出（dryRun）或刪除沒人用到的舊上傳圖：客戶在排版時上傳、但最後沒有存成設計的圖片。
 * 只要資料庫任何地方提到這個檔名就保留；查資料庫出錯時整個放棄，不刪任何檔案。
 * 只由後台「儲存空間」頁的按鈕觸發，不會自動執行。
 */
export async function cleanupOrphanUploads(opts: { dryRun?: boolean; now?: number } = {}): Promise<{ deleted: number; freedMb: number; kept: number }> {
  const now = opts.now ?? Date.now();
  let names: string[];
  try { names = await readdir(DIR); } catch { return { deleted: 0, freedMb: 0, kept: 0 }; }
  const used = await referencedUploads();
  const cutoff = now - KEEP_DAYS * 86400_000;
  let deleted = 0, freed = 0, kept = 0;
  for (const name of names) {
    const full = path.join(DIR, name);
    const st = await stat(full).catch(() => null);
    if (!st?.isFile()) continue;
    if (st.mtimeMs > cutoff || used.has(name)) { kept++; continue; }
    if (opts.dryRun) { deleted++; freed += st.size; continue; }
    await unlink(full).then(() => { deleted++; freed += st.size; }, () => { kept++; });
  }
  return { deleted, freedMb: Math.round((freed / 1048576) * 10) / 10, kept };
}

export const UPLOAD_KEEP_DAYS = KEEP_DAYS;

/** 資料磁碟的用量：剩餘空間與各資料夾大小（MB） */
export async function diskUsage(): Promise<{ freeMb: number; totalMb: number; parts: { name: string; mb: number }[] }> {
  const { statfs } = await import("node:fs/promises");
  const filesRoot = path.resolve(process.env.STORAGE_DIR ?? "./data/files");
  const url = process.env.DATABASE_URL ?? "file:./data/store.db";
  const dataRoot = url.startsWith("file:") ? path.dirname(path.resolve(url.slice(5))) : path.dirname(filesRoot);
  const mb = (n: number) => Math.round((n / 1048576) * 10) / 10;
  const size = async (p: string): Promise<number> => {
    const st = await stat(p).catch(() => null);
    if (!st) return 0;
    if (!st.isDirectory()) return st.size;
    let total = 0;
    for (const f of await readdir(p).catch(() => [] as string[])) total += await size(path.join(p, f));
    return total;
  };
  const parts: { name: string; mb: number }[] = [];
  for (const f of await readdir(dataRoot).catch(() => [] as string[])) {
    const full = path.join(dataRoot, f);
    if (path.resolve(full) === filesRoot) for (const g of await readdir(full).catch(() => [] as string[])) parts.push({ name: `files/${g}`, mb: mb(await size(path.join(full, g))) });
    else parts.push({ name: f, mb: mb(await size(full)) });
  }
  const fsStat = await statfs(dataRoot);
  return { freeMb: mb(fsStat.bavail * fsStat.bsize), totalMb: mb(fsStat.blocks * fsStat.bsize), parts: parts.filter((x) => x.mb > 0).sort((a, b) => b.mb - a.mb) };
}
