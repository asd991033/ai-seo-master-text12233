import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** 取回設計稿的可編輯內容（供購物車「重新編輯」使用；ID 為隨機字串） */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{24}$/.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [d] = await db.select().from(schema.designs).where(eq(schema.designs.id, id));
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ productId: d.productId, data: Object.fromEntries(Object.entries(d.data).map(([k, v]) => [k, { areaCode: v.areaCode, json: v.json }])) });
}
