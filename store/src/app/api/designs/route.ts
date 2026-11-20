import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getUser } from "@/lib/auth";
import { parseDataUrl, saveRandom } from "@/lib/storage";

const PNG = { "image/png": ".png" };
const PREVIEW = { "image/png": ".png", "image/jpeg": ".jpg" };
const MAX_BODY = 80 * 1024 * 1024;

type Incoming = {
  productId: number;
  preview?: string | null;
  positions: Record<string, { areaCode: string; json: unknown; pxPerMm: number; print: string; svg: string; mockup: string }>;
};

/** 儲存線上排版結果：每個位置的可編輯 JSON、300dpi 印刷 PNG、向量 SVG、示意圖合成 */
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return NextResponse.json({ error: "設計檔過大" }, { status: 413 });
  const body = (await req.json().catch(() => null)) as Incoming | null;
  if (!body || typeof body.productId !== "number" || !body.positions || typeof body.positions !== "object") {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  const [product] = await db.select({ id: schema.products.id }).from(schema.products).where(and(eq(schema.products.id, body.productId), eq(schema.products.active, true)));
  if (!product) return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  const positions = await db.select().from(schema.printPositions).where(eq(schema.printPositions.productId, product.id));

  const data: (typeof schema.designs.$inferInsert)["data"] = {};
  for (const [code, p] of Object.entries(body.positions)) {
    if (!positions.some((x) => x.code === code)) return NextResponse.json({ error: `未知的印刷位置 ${code}` }, { status: 400 });
    const print = parseDataUrl(String(p.print ?? ""), PNG);
    if (!print) return NextResponse.json({ error: "印刷檔格式錯誤" }, { status: 400 });
    const mockup = parseDataUrl(String(p.mockup ?? ""), PREVIEW);
    const svg = typeof p.svg === "string" && p.svg.includes("<svg") ? p.svg : null;
    data[code] = {
      areaCode: String(p.areaCode),
      json: { pxPerMm: p.pxPerMm, canvas: p.json },
      printUrl: await saveRandom("designs", print.ext, print.data),
      svgUrl: svg ? await saveRandom("designs", ".svg", Buffer.from(svg, "utf8")) : null,
      mockupUrl: mockup ? await saveRandom("designs", mockup.ext, mockup.data) : null,
    };
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "設計內容是空的" }, { status: 400 });

  const preview = body.preview ? parseDataUrl(body.preview, PREVIEW) : null;
  const previewUrl = preview ? await saveRandom("designs", preview.ext, preview.data) : Object.values(data)[0].mockupUrl;
  const id = randomBytes(12).toString("hex");
  const user = await getUser();
  await db.insert(schema.designs).values({ id, productId: product.id, userId: user?.id ?? null, data, previewUrl });
  return NextResponse.json({ id, previewUrl });
}
