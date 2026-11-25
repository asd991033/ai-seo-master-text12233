/**
 * 安全的資料庫更新（部署時在 drizzle-kit push 之前執行）。
 *
 * 為什麼需要：drizzle-kit push --force 遇到「替已有資料的表新增必填欄位」時，會先 `delete from 該表` 再加欄位，
 * 也就是把整張表的資料清空。這支程式改用 `ALTER TABLE ... ADD COLUMN`（SQLite 會替舊資料填入預設值，不會動到資料），
 * 先把缺少的欄位補上，之後的 push 就只剩「建立新資料表」這類不會刪資料的工作。
 *
 *   tsx src/db/migrate.ts          備份資料庫檔，補上缺少的欄位
 *   tsx src/db/migrate.ts verify   確認資料表與欄位都齊全，不齊就以錯誤結束（讓部署失敗、保留舊版繼續運作）
 */
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readdirSync, readSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { is, SQL } from "drizzle-orm";
import { getTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/store.db";
const KEEP_BACKUPS = 5;
const BACKUP_RE = /^store-\d{8}T\d{6}Z?\.db$/;

/** 備份檔是否完整：檔案大小要達到 SQLite 檔頭記錄的頁數（磁碟滿時複製到一半的檔案會比較小） */
function isComplete(file: string): boolean {
  try {
    const size = statSync(file).size;
    if (size < 100) return false;
    const head = Buffer.alloc(32);
    const fd = openSync(file, "r");
    try { readSync(fd, head, 0, 32, 0); } finally { closeSync(fd); }
    if (head.toString("latin1", 0, 15) !== "SQLite format 3") return false;
    const pageSize = head.readUInt16BE(16) === 1 ? 65536 : head.readUInt16BE(16);
    return size >= pageSize * head.readUInt32BE(28);
  } catch {
    return false;
  }
}

/**
 * 更新前先複製一份資料庫檔到同一個磁碟的 backups 資料夾。
 * 備份不能讓網站起不來：磁碟空間不夠時先刪最舊的備份再試，真的放不下就略過這次備份繼續啟動。
 */
function backup() {
  if (!url.startsWith("file:")) return;
  const file = path.resolve(url.slice(5));
  if (!existsSync(file) || statSync(file).size === 0) return;
  const dir = path.join(path.dirname(file), "backups");
  const remove = (name: string) => { for (const ext of ["", "-wal", "-shm"]) { try { unlinkSync(path.join(dir, name + ext)); } catch { /* 不存在 */ } } };
  try {
    mkdirSync(dir, { recursive: true });
    // 舊到新；先清掉複製到一半的殘檔，再只留最近幾份
    let old = readdirSync(dir).filter((f) => BACKUP_RE.test(f)).sort();
    for (const f of old.filter((f) => !isComplete(path.join(dir, f)))) { remove(f); console.warn(`[migrate] removed incomplete backup: ${f}`); }
    old = readdirSync(dir).filter((f) => BACKUP_RE.test(f)).sort();
    while (old.length > KEEP_BACKUPS - 1) remove(old.shift()!);
    const name = `store-${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "")}.db`;
    for (;;) {
      try {
        copyFileSync(file, path.join(dir, name));
        for (const ext of ["-wal", "-shm"]) if (existsSync(file + ext)) copyFileSync(file + ext, path.join(dir, name + ext));
        console.log(`[migrate] backup saved: ${path.join(dir, name)}`);
        return;
      } catch (e) {
        remove(name);
        if ((e as NodeJS.ErrnoException).code !== "ENOSPC") throw e;
        // 至少保留最新的一份舊備份
        if (old.length <= 1) { console.warn("[migrate] 磁碟空間不足，略過這次備份（請擴充磁碟或清理檔案）"); return; }
        const victim = old.shift()!;
        remove(victim);
        console.warn(`[migrate] 磁碟空間不足，刪除最舊的備份 ${victim} 後重試`);
      }
    }
  } catch (e) {
    console.warn("[migrate] 備份失敗，略過（不影響啟動）", e);
  }
}

const q = (s: string) => `\`${s.replace(/`/g, "")}\``;
function literal(v: unknown): string {
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
  return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
}

async function main() {
  const verify = process.argv[2] === "verify";
  if (!verify) backup();
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  const tables = (Object.values(schema) as unknown[]).filter((t) => is(t, SQLiteTable)).map((t) => getTableConfig(t as SQLiteTable));
  const problems: string[] = [];
  let added = 0;
  for (const t of tables) {
    const info = await client.execute(`PRAGMA table_info(${q(t.name)})`);
    if (!info.rows.length) {
      // 新資料表交給後面的 drizzle-kit push 建立（空表，沒有資料可刪）
      if (verify) problems.push(`缺少資料表 ${t.name}`);
      continue;
    }
    const have = new Set(info.rows.map((r) => String(r.name)));
    for (const c of t.columns) {
      if (have.has(c.name)) continue;
      if (verify) { problems.push(`缺少欄位 ${t.name}.${c.name}`); continue; }
      let def = "";
      if (c.hasDefault && c.default !== undefined) {
        // SQLite 的 ADD COLUMN 只接受常數預設值；像 unixepoch() 這種運算式無法安全加上，必須人工處理
        if (is(c.default, SQL)) throw new Error(`[migrate] ${t.name}.${c.name} 的預設值是運算式，無法自動新增，請手動處理後再部署`);
        def = ` DEFAULT ${literal(c.default)}`;
      }
      if (c.notNull && !def) throw new Error(`[migrate] ${t.name}.${c.name} 是必填欄位但沒有預設值，無法在不影響既有資料的情況下新增`);
      const before = Number((await client.execute(`SELECT count(*) AS n FROM ${q(t.name)}`)).rows[0].n);
      await client.execute(`ALTER TABLE ${q(t.name)} ADD COLUMN ${q(c.name)} ${c.getSQLType()}${def}${c.notNull ? " NOT NULL" : ""}`);
      const after = Number((await client.execute(`SELECT count(*) AS n FROM ${q(t.name)}`)).rows[0].n);
      if (after !== before) throw new Error(`[migrate] ${t.name} 筆數由 ${before} 變成 ${after}，中止`);
      console.log(`[migrate] added ${t.name}.${c.name}（${after} 筆資料保留）`);
      added++;
    }
  }
  if (verify) {
    if (problems.length) { console.error(`[migrate] 資料庫結構與程式不一致，中止啟動：\n- ${problems.join("\n- ")}`); process.exit(1); }
    console.log("[migrate] schema verified");
  } else if (!added) console.log("[migrate] no columns to add");
}

main().catch((e) => { console.error(e); process.exit(1); });
