/**
 * 匯入 catalog/ 資料夾內的商品資料檔（例如 hicustom.json）。
 * 每個檔案的內容雜湊會記錄在 settings，內容沒變就略過，所以可以在每次啟動時執行。
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import { importCatalog, type ImportData } from "../lib/importer";

async function main() {
  const dir = path.resolve("catalog");
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const raw = readFileSync(path.join(dir, file));
    const hash = createHash("sha256").update(raw).digest("hex");
    const key = `catalog_hash_${file}`;
    const [prev] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
    if (prev?.value === hash && process.env.FORCE_IMPORT !== "1") {
      console.log(`[catalog] ${file} unchanged, skip`);
      continue;
    }
    const t0 = Date.now();
    const data = JSON.parse(raw.toString("utf8")) as ImportData;
    // 不是商品目錄的 JSON（沒有 products 陣列）就略過，不要讓啟動失敗
    if (!Array.isArray((data as { products?: unknown }).products)) { console.log(`[catalog] ${file} is not a catalogue, skip`); continue; }
    const res = await importCatalog(data);
    if (!res.ok) {
      console.error(`[catalog] ${file} failed:\n` + res.errors.slice(0, 30).join("\n"));
      process.exitCode = 1;
      continue;
    }
    await db.insert(schema.settings).values({ key, value: hash }).onConflictDoUpdate({ target: schema.settings.key, set: { value: hash } });
    console.log(`[catalog] ${file} imported`, res.counts, `${Date.now() - t0}ms`);
  }
}

main().then(() => process.exit(process.exitCode ?? 0), (e) => { console.error(e); process.exit(1); });
