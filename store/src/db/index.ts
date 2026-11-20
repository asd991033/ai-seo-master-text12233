import { mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof make> };

function make() {
  const url = process.env.DATABASE_URL ?? "file:./data/store.db";
  // 本機檔案資料庫：確保資料夾存在（建置階段永久磁碟尚未掛載）
  if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice(5)), { recursive: true });
  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  return drizzle(client, { schema });
}

export const db = globalForDb.__db ?? (globalForDb.__db = make());
export { schema };
