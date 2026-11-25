import "server-only";
import ExcelJS from "exceljs";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { readSheets, SheetReadError, type Sheet } from "./sheet-reader";
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
  ["SKU *", "sku"], ["訂單編號", "orderNo"], ["評價者名稱 *", "authorName"], ["星等 * (1–5)", "rating"], ["標題", "title"], ["評價內容 *", "body"], ["評價日期", "date"],
] as const;
type RowKey = (typeof COLS)[number][1];
export type ReviewRow = Partial<Record<RowKey, string>> & { rowNo: number };
export const REVIEW_SHEET = "評價";
const MAX_ROWS = 5000;

const NOTES = [
  "【填寫說明】",
  "1. 每一列是一則評價，SKU 必須是本站已有的商品。",
  "2. 訂單編號可以留空。有填的話，必須是本站「已付款、已出貨或已完成」而且買了這個 SKU 的訂單。",
  "3. 同一張訂單的同一件商品只能有一則評價；已經有評價的不會重複匯入。",
  "4. 評價者名稱與內容請照買家原文填寫。星等為 1–5 的整數。",
  "5. 評價日期格式 YYYY-MM-DD，不能是未來日期（有填訂單編號時也不能早於下單日）；留空則用匯入當下的時間。",
  "6. 只要有任何一列有問題，整個檔案都不會匯入，請依錯誤訊息修正後重新上傳。",
  "7. 匯入的評價會直接公開，並一律標示「已驗證購買」，請只匯入真實買家的評價。範本中的示範列匯入前請刪除。",
];

export async function buildReviewTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(REVIEW_SHEET);
  ws.columns = COLS.map(([header, key]) => ({ header, key, width: key === "body" ? 60 : 20 }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1ECE3" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.addRow({ sku: "BAG-DEMO-01", orderNo: "", authorName: "王小明", rating: 5, title: "印刷很清楚", body: "顏色跟預覽幾乎一樣，車線也很整齊。", date: "2026-01-15" });
  const notes = wb.addWorksheet("說明");
  notes.getColumn(1).width = 120;
  NOTES.forEach((line) => notes.addRow([line]));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** 把使用者檔案裡的各種標題寫法對到欄位（不分大小寫，忽略 *、空白與括號說明） */
const ALIASES: Record<RowKey, string[]> = {
  sku: ["sku", "商品sku", "產品sku", "商品編號", "產品編號", "商品貨號", "貨號"],
  orderNo: ["訂單編號", "訂單號", "訂單號碼", "orderno", "order", "ordernumber", "orderid"],
  authorName: ["評價者名稱", "評價者", "評論者", "姓名", "名稱", "買家", "買家名稱", "顧客", "顧客名稱", "name", "author", "authorname", "reviewer", "reviewername", "customer", "customername"],
  rating: ["星等", "星數", "評分", "rating", "stars", "star", "score"],
  title: ["標題", "評價標題", "title", "headline", "reviewtitle"],
  body: ["評價內容", "評論內容", "內容", "評價", "評論", "review", "body", "content", "comment", "reviewtext", "reviewbody"],
  date: ["評價日期", "評論日期", "日期", "date", "reviewdate", "createdat"],
};
const normHeader = (s: string) => s.replace(/[（(][^）)]*[）)]/g, "").replace(/[\s*＊_\-]/g, "").toLowerCase();
const headerKey = (s: string) => (Object.keys(ALIASES) as RowKey[]).find((k) => ALIASES[k].includes(normHeader(s)));
/** Excel 日期序號（備援讀法與 CSV 會拿到數字）轉成 YYYY-MM-DD */
const fixDate = (s: string) => (/^\d{5}(\.\d+)?$/.test(s) ? new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000).toISOString().slice(0, 10) : s);

export async function parseReviewWorkbook(data: ArrayBuffer): Promise<{ rows: ReviewRow[]; errors: string[] }> {
  let sheets: Sheet[];
  try {
    sheets = await readSheets(data);
  } catch (e) {
    if (e instanceof SheetReadError) return { rows: [], errors: [e.message] };
    throw e;
  }
  const required = COLS.filter(([h]) => h.includes("*"));
  const candidates = sheets.filter((s) => s.rows.length).map((s) => {
    const headers = new Map<number, RowKey>();
    s.rows[0].cells.forEach((text, col) => { const k = headerKey(text); if (k && ![...headers.values()].includes(k)) headers.set(col, k); });
    return { sheet: s, headers, missing: required.filter(([, k]) => ![...headers.values()].includes(k)).map(([h]) => h.replace(/\s*\*.*/, "")) };
  });
  if (!candidates.length) return { rows: [], errors: ["檔案中沒有可匯入的評價"] };
  // 優先用「評價」工作表；不然用第一個標題列齊全的工作表
  const pick = candidates.find((c) => !c.missing.length && c.sheet.name === REVIEW_SHEET) ?? candidates.find((c) => !c.missing.length);
  if (!pick) {
    const best = [...candidates].sort((a, b) => a.missing.length - b.missing.length)[0];
    const seen = best.sheet.rows[0].cells.filter(Boolean).slice(0, 12).join("、") || "（空白）";
    return { rows: [], errors: [`第一列（標題列）找不到必要欄位：${best.missing.join("、")}。目前讀到的標題是：${seen}。請把第一列改成範本的標題`] };
  }
  const rows: ReviewRow[] = [];
  for (const row of pick.sheet.rows.slice(1)) {
    const rec: ReviewRow = { rowNo: row.rowNo };
    let any = false;
    for (const [col, key] of pick.headers) {
      const text = (row.cells[col] ?? "").trim();
      if (text) { rec[key] = key === "date" ? fixDate(text) : text; any = true; }
    }
    if (any) rows.push(rec);
  }
  if (!rows.length) return { rows, errors: ["檔案中沒有可匯入的評價（只有標題列）"] };
  if (rows.length > MAX_ROWS) return { rows: [], errors: [`一次最多匯入 ${MAX_ROWS} 列，這個檔案有 ${rows.length} 列`] };
  return { rows, errors: [] };
}

/** 檢查每一列後整批寫入；有任何錯誤就完全不寫入。匯入的評價一律標示已驗證購買（由店家確認是真實買家） */
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
  const skus = uniq(rows.filter((r) => !r.orderNo).map((r) => r.sku?.toLowerCase()));
  const products = (await Promise.all(chunk(skus).map((c) => db.select({ id: schema.products.id, sku: schema.products.sku }).from(schema.products).where(inArray(sql`lower(${schema.products.sku})`, c))))).flat();
  const productBySku = new Map(products.map((p) => [p.sku.toLowerCase(), p.id]));
  const taken = new Set(existing.map((e) => `${e.orderId}:${e.productId}`));
  const nowSec = Math.floor(Date.now() / 1000);
  const values: (typeof schema.reviews.$inferInsert)[] = [];

  for (const r of rows) {
    if (!r.sku) { err(r, "缺少 SKU"); continue; }
    const cleaned = cleanReview(r);
    if (!cleaned.ok) { err(r, cleaned.error); continue; }
    const date = parseReviewDate(r.date);
    if (date === null) { err(r, `評價日期格式錯誤：${r.date}（請用 YYYY-MM-DD）`); continue; }
    if (date !== undefined && date > nowSec) { err(r, "評價日期不能是未來"); continue; }
    const base = { ...cleaned.value, status: "published" as const, source: "import" as const, createdAt: date ?? nowSec };
    if (!r.orderNo) {
      const productId = productBySku.get(r.sku.toLowerCase());
      if (!productId) { err(r, `找不到 SKU「${r.sku}」`); continue; }
      values.push({ ...base, productId, orderId: null, verified: true });
      continue;
    }
    const order = orderByNo.get(r.orderNo);
    if (!order) { err(r, `找不到訂單 ${r.orderNo}（沒有本站訂單的評價請把訂單編號留空）`); continue; }
    if (!canReviewOrder(order)) { err(r, `訂單 ${r.orderNo} 尚未付款或尚未出貨，不能評價`); continue; }
    const item = items.find((i) => i.orderId === order.id && i.sku.toLowerCase() === r.sku!.toLowerCase());
    if (!item) { err(r, `訂單 ${r.orderNo} 裡沒有商品 ${r.sku}`); continue; }
    if (date !== undefined && date < order.createdAt - 86400) { err(r, "評價日期早於下單日"); continue; }
    const key = `${order.id}:${item.productId}`;
    if (taken.has(key)) { err(r, `訂單 ${r.orderNo} 的 ${r.sku} 已經有評價`); continue; }
    taken.add(key);
    values.push({ ...base, productId: item.productId, orderId: order.id, verified: true });
  }
  if (errors.length) return { ok: false, imported: 0, errors };
  await db.transaction(async (tx) => { for (const c of chunk(values, 100)) await tx.insert(schema.reviews).values(c); });
  return { ok: true, imported: values.length, errors: [] };
}
