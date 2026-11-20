import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { DEFAULT_MARGIN } from "./pricing";

type Db = Pick<typeof db, "select">;

/** 匯率：1 單位外幣 = 多少站台幣別。預設人民幣 4.5 */
export const DEFAULT_FX: Record<string, number> = { CNY: 4.5 };

export async function getPricingSettings(tx: Db = db) {
  const rows = await tx.select().from(schema.settings);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const margin = map.has("margin_rate") ? Number(map.get("margin_rate")) : DEFAULT_MARGIN;
  const fx = (cur: string | null | undefined) => {
    if (!cur) return 1;
    const v = map.get(`fx_${cur}`);
    return v ? Number(v) : DEFAULT_FX[cur] ?? 1;
  };
  return { margin, fx };
}

export async function setSetting(key: string, value: string, tx: Pick<typeof db, "insert"> = db) {
  await tx.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });
}

export { eq };
