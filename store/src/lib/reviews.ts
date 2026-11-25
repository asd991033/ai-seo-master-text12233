import "server-only";
import ExcelJS from "exceljs";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { averageRating, canReviewOrder, cleanReview, parseReviewDate } from "./review-rules";

export type Review = typeof schema.reviews.$inferSelect;

/** 商品頁：已公開的評價與平均星等 */
export async function productReviews(productId: number, limit = 30) {
  const pub = and(eq(schema.reviews.productId, productId), eq(schema.reviews.status, "published"));
  const [[stat], list] = await Promise.all([
    db.select({ count: sql<number>`count(*)`, sum: sql<number>`coalesce(sum(${schema.reviews.rating}), 0)` }).from(schema.reviews).where(pub),
    db.select().from(schema.reviews).where(pub).orderBy(desc(schema.reviews.createdAt), desc(schema.reviews.id)).limit(limit),
  ]);
  return { count: Number(stat.count), average: averageRating(Number(stat.sum), Number(stat.count)), list };
}

/** 訂單頁：這張訂單可以評價的商品（同一件商品只列一次）與已寫過的評價 */
export async function orderReviewState(order: { id: number; paid: boolean; status: string }, items: { productId: number; name: string }[]) {
  if (!canReviewOrder(order)) return [];
  const done = await db.select().from(schema.reviews).where(eq(schema.reviews.orderId, order.id));
  const seen = new Set<number>();
  return items.filter((i) => !seen.has(i.productId) && seen.add(i.productId)).map((i) => ({ productId: i.productId, name: i.name, review: done.find((r) => r.productId === i.productId) ?? null }));
}

/* ───────── Excel 批量匯入 ───────── */

const COLS = [
  ["訂單編號 *", "orderNo"], ["SKU *", "sku"], ["評價者名稱 *", "authorName"], ["星等 * (1–5)", "rating"], ["標題", "title"], ["評價內容 *", "body"], ["評價日期", "date"],
] as const;
type RowKey = (typeof COLS)[number][1];
export type ReviewRow = Partial<Record<RowKey, string>> & { rowNo: number };
export const REVIEW_SHEET = "評價";
const MAX_ROWS = 5000;

const NOTES = [
  "【填寫說明】",
  "1. 每一列是一則評價，必須對應本站一張「已付款、已出貨或已完成」的訂單，而且該訂單裡有這個 SKU。對不到訂單的列不會匯入。",
  "2. 同一張訂單的同一件商品只能有一則評價；已經有評價的不會重複匯入。",
  "3. 評價者名稱與內容請照買家原文填寫。星等為 1–5 的整數。",
  "4. 評價日期格式 YYYY-MM-DD，不能早於下單日、不能是未來日期；留空則用匯入當下的時間。",
  "5. 只要有任何一列有問題，整個檔案都不會匯入，請依錯誤訊息修正後重新上傳。",
  "6. 匯入的評價會直接公開，並標示「已驗證購買」。範本中的示範列匯入前請刪除。",
];

export async function buildReviewTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(REVIEW_SHEET);
  ws.columns = COLS.map(([header, key]) => ({ header, key, width: key === "body" ? 60 : 20 }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1ECE3" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.addRow({ orderNo: "（訂單編號）", sku: "BAG-DEMO-01", authorName: "王小明", rating: 5, title: "印刷很清楚", body: "顏色跟預覽幾乎一樣，車線也很整齊。", date: "2026-01-15" });
  const notes = wb.addWorksheet("說明");
  notes.getColumn(1).width = 120;
  NOTES.forEach((line) => notes.addRow([line]));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if (v instanceof Date) return v.toISOString();
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text);
    return "";
  }
  return String(v);
}

export async function parseReviewWorkbook(data: ArrayBuffer): Promise<{ rows: ReviewRow[]; errors: string[] }> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(data as any);
  const ws = wb.getWorksheet(REVIEW_SHEET) ?? wb.worksheets[0];
  if (!ws) return { rows: [], errors: ["檔案裡沒有工作表"] };
  const headers = new Map<number, RowKey>();
  ws.getRow(1).eachCell((cell, col) => {
    const hit = COLS.find(([h]) => h === cellText(cell.value).trim());
    if (hit) headers.set(col, hit[1]);
  });
  const missing = COLS.filter(([h, k]) => h.includes("*") && ![...headers.values()].includes(k)).map(([h]) => h);
  if (missing.length) return { rows: [], errors: [`找不到必要欄位：${missing.join("、")}。請使用範本的標題列（每則評價都需要訂單編號）`] };
  const rows: ReviewRow[] = [];
  ws.eachRow((row, rowNo) => {
    if (rowNo === 1) return;
    const rec: ReviewRow = { rowNo };
    let any = false;
    for (const [col, key] of headers) {
      const text = cellText(row.getCell(col).value).trim();
      if (text) { rec[key] = text; any = true; }
    }
    if (any) rows.push(rec);
  });
  if (!rows.length) return { rows, errors: ["檔案中沒有可匯入的評價"] };
  if (rows.length > MAX_ROWS) return { rows: [], errors: [`一次最多匯入 ${MAX_ROWS} 列，這個檔案有 ${rows.length} 列`] };
  return { rows, errors: [] };
}

/** 檢查每一列都對得到真實訂單後整批寫入；有任何錯誤就完全不寫入 */
export async function importReviews(rows: ReviewRow[]): Promise<{ ok: boolean; imported: number; errors: string[] }> {
  const errors: string[] = [];
  const err = (r: ReviewRow, msg: string) => { if (errors.length < 100) errors.push(`第 ${r.rowNo} 列：${msg}`); };
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];
  const chunk = <T,>(xs: T[], n = 200) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

  const orderNos = uniq(rows.map((r) => r.orderNo));
  const orders = (await Promise.all(chunk(orderNos).map((c) => db.select().from(schema.orders).where(inArray(schema.orders.orderNo, c))))).flat();
  const orderByNo = new Map(orders.map((o) => [o.orderNo, o]));
  const orderIds = orders.map((o) => o.id);
  const [items, existing] = await Promise.all([
    Promise.all(chunk(orderIds).map((c) => db.select({ orderId: schema.orderItems.orderId, productId: schema.orderItems.productId, sku: schema.orderItems.sku }).from(schema.orderItems).where(inArray(schema.orderItems.orderId, c)))).then((x) => x.flat()),
    Promise.all(chunk(orderIds).map((c) => db.select({ orderId: schema.reviews.orderId, productId: schema.reviews.productId }).from(schema.reviews).where(inArray(schema.reviews.orderId, c)))).then((x) => x.flat()),
  ]);
  const taken = new Set(existing.map((e) => `${e.orderId}:${e.productId}`));
  const nowSec = Math.floor(Date.now() / 1000);
  const values: (typeof schema.reviews.$inferInsert)[] = [];

  for (const r of rows) {
    if (!r.orderNo) { err(r, "缺少訂單編號"); continue; }
    if (!r.sku) { err(r, "缺少 SKU"); continue; }
    const order = orderByNo.get(r.orderNo);
    if (!order) { err(r, `找不到訂單 ${r.orderNo}`); continue; }
    if (!canReviewOrder(order)) { err(r, `訂單 ${r.orderNo} 尚未付款或尚未出貨，不能評價`); continue; }
    const item = items.find((i) => i.orderId === order.id && i.sku.toLowerCase() === r.sku!.toLowerCase());
    if (!item) { err(r, `訂單 ${r.orderNo} 裡沒有商品 ${r.sku}`); continue; }
    const cleaned = cleanReview(r);
    if (!cleaned.ok) { err(r, cleaned.error); continue; }
    const date = parseReviewDate(r.date);
    if (date === null) { err(r, `評價日期格式錯誤：${r.date}（請用 YYYY-MM-DD）`); continue; }
    if (date !== undefined && date > nowSec) { err(r, "評價日期不能是未來"); continue; }
    if (date !== undefined && date < order.createdAt - 86400) { err(r, "評價日期早於下單日"); continue; }
    const key = `${order.id}:${item.productId}`;
    if (taken.has(key)) { err(r, `訂單 ${r.orderNo} 的 ${r.sku} 已經有評價`); continue; }
    taken.add(key);
    values.push({ ...cleaned.value, productId: item.productId, orderId: order.id, status: "published", source: "import", verified: true, createdAt: date ?? nowSec });
  }
  if (errors.length) return { ok: false, imported: 0, errors };
  await db.transaction(async (tx) => { for (const c of chunk(values, 100)) await tx.insert(schema.reviews).values(c); });
  return { ok: true, imported: values.length, errors: [] };
}
