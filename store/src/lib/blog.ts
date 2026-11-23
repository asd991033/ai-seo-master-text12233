import { and, desc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";

export type Post = typeof schema.posts.$inferSelect;

export const listPosts = (limit = 50) =>
  db.select().from(schema.posts).where(eq(schema.posts.published, true)).orderBy(desc(schema.posts.publishedAt)).limit(limit);

export async function getPost(slug: string) {
  const [p] = await db.select().from(schema.posts).where(and(eq(schema.posts.slug, slug), eq(schema.posts.published, true)));
  return p ?? null;
}
export const otherPosts = (id: number, limit = 3) =>
  db.select().from(schema.posts).where(and(eq(schema.posts.published, true), ne(schema.posts.id, id))).orderBy(desc(schema.posts.publishedAt)).limit(limit);

export const fmtPostDate = (ts: number) => new Date(ts * 1000).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Taipei" });
