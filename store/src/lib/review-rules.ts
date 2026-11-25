/** 評價欄位的檢查規則（買家表單、後台代登、Excel 匯入共用） */

export const REVIEW_LIMITS = { name: 60, title: 120, body: 2000 } as const;
/** 訂單要到這些狀態（已出貨、已完成）才算收到商品，可以評價 */
export const REVIEWABLE_STATUSES = ["shipped", "completed"] as const;

export const canReviewOrder = (o: { paid: boolean; status: string }) => o.paid && (REVIEWABLE_STATUSES as readonly string[]).includes(o.status);

/** 星等：1–5 的整數，其他一律回傳 null */
export function parseRating(v: unknown): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** 日期（YYYY-MM-DD、YYYY/MM/DD 或 ISO 時間）轉成 unix 秒；空白回傳 undefined，格式錯誤回傳 null */
export function parseReviewDate(v: unknown): number | null | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|[T ])/.exec(s);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d, 4); // 台北時間中午
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return Math.floor(ms / 1000);
}

export type ReviewInput = { authorName: string; rating: number; title: string; body: string };

/** 整理並檢查評價內容；回傳 error 是給後台看的中文說明 */
export function cleanReview(raw: { authorName?: unknown; rating?: unknown; title?: unknown; body?: unknown }): { ok: true; value: ReviewInput } | { ok: false; error: string } {
  const text = (v: unknown) => String(v ?? "").replace(/\r\n?/g, "\n").trim();
  const authorName = text(raw.authorName), title = text(raw.title), body = text(raw.body), rating = parseRating(raw.rating);
  if (!authorName) return { ok: false, error: "缺少評價者名稱" };
  if (authorName.length > REVIEW_LIMITS.name) return { ok: false, error: `評價者名稱超過 ${REVIEW_LIMITS.name} 字` };
  if (rating == null) return { ok: false, error: "星等必須是 1–5 的整數" };
  if (!body) return { ok: false, error: "缺少評價內容" };
  if (body.length > REVIEW_LIMITS.body) return { ok: false, error: `評價內容超過 ${REVIEW_LIMITS.body} 字` };
  if (title.length > REVIEW_LIMITS.title) return { ok: false, error: `標題超過 ${REVIEW_LIMITS.title} 字` };
  return { ok: true, value: { authorName, rating, title, body } };
}

/** 平均星等（四捨五入到小數一位） */
export const averageRating = (sum: number, count: number) => (count > 0 ? Math.round((sum / count) * 10) / 10 : 0);
