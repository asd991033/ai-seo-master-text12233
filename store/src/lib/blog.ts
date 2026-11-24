import { and, desc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentMarket } from "@/market/server";

export type Post = typeof schema.posts.$inferSelect;
const mine = (market: string = currentMarket().code) => and(eq(schema.posts.published, true), eq(schema.posts.market, market));

/** 文章各國分開：每個國家站只列出、只能開啟自己的文章 */
export const listPosts = (limit = 50, market?: string) =>
  db.select().from(schema.posts).where(mine(market)).orderBy(desc(schema.posts.publishedAt), desc(schema.posts.id)).limit(limit);

export async function getPost(slug: string) {
  const [p] = await db.select().from(schema.posts).where(and(eq(schema.posts.slug, slug), mine()));
  return p ?? null;
}
export const otherPosts = (id: number, limit = 3) =>
  db.select().from(schema.posts).where(and(mine(), ne(schema.posts.id, id))).orderBy(desc(schema.posts.publishedAt), desc(schema.posts.id)).limit(limit);

export const fmtPostDate = (ts: number) => {
  const m = currentMarket();
  return new Date(ts * 1000).toLocaleDateString(m.locale === "en" ? m.lang : "zh-TW", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Taipei" });
};

/** 從內文的「FAQ／常見問題」段落取出問答（### 問題 + 後面的段落），給 FAQ 結構化資料用 */
export function faqOf(md: string): { q: string; a: string }[] {
  const lines = md.replace(/\r/g, "").split("\n");
  const start = lines.findIndex((l) => /^##\s+(FAQs?|Frequently Asked Questions|常見問題)\s*$/i.test(l.trim()));
  if (start < 0) return [];
  const out: { q: string; a: string }[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    const h = /^###\s+(.+)$/.exec(lines[i]);
    if (!h) continue;
    const buf: string[] = [];
    for (let j = i + 1; j < lines.length && !/^#{2,3}\s/.test(lines[j]); j++) if (lines[j].trim()) buf.push(lines[j].trim());
    const a = buf.join(" ").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^[-*]\s+/, "").trim();
    if (a) out.push({ q: h[1].trim(), a });
  }
  return out;
}
