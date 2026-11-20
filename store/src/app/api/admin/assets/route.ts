import { NextResponse } from "next/server";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getUser } from "@/lib/auth";
import { saveNamed } from "@/lib/storage";

const IMG = [".png", ".jpg", ".jpeg", ".webp", ".svg"];

/**
 * 批量上傳刀模 / 示意圖 / 商品圖，依檔名自動對應：
 *   {SKU}_{位置代碼}.svg          → 刀模
 *   {SKU}_{位置代碼}_mockup.png   → 示意圖
 *   {SKU}.jpg / {SKU}_1.jpg …     → 商品圖（數字為排序）
 */
export async function POST(req: Request) {
  const user = await getUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const files = (await req.formData()).getAll("files").filter((f): f is File => f instanceof File);
  const products = await db.select({ id: schema.products.id, sku: schema.products.sku, images: schema.products.images }).from(schema.products);
  products.sort((a, b) => b.sku.length - a.sku.length);
  const results: { file: string; ok: boolean; message: string }[] = [];

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    const base = path.basename(file.name, path.extname(file.name));
    const fail = (message: string) => results.push({ file: file.name, ok: false, message });
    if (!IMG.includes(ext)) { fail("不支援的格式"); continue; }
    const product = products.find((p) => base.toLowerCase() === p.sku.toLowerCase() || base.toLowerCase().startsWith(p.sku.toLowerCase() + "_"));
    if (!product) { fail("檔名開頭找不到對應的 SKU"); continue; }
    const rest = base.slice(product.sku.length + 1);
    const data = Buffer.from(await file.arrayBuffer());

    if (rest === "" || /^\d+$/.test(rest)) {
      if (ext === ".svg") { fail("商品圖請使用 PNG / JPG / WEBP"); continue; }
      const url = await saveNamed("catalog", file.name, data);
      const idx = rest ? Math.max(0, Number(rest) - 1) : 0;
      const images = [...product.images.filter((u) => u !== url)];
      images.splice(Math.min(idx, images.length), 0, url);
      product.images = images;
      await db.update(schema.products).set({ images }).where(eq(schema.products.id, product.id));
      results.push({ file: file.name, ok: true, message: `商品圖 #${idx + 1}` });
      continue;
    }
    const isMockup = /_mockup$/i.test(rest);
    const code = isMockup ? rest.replace(/_mockup$/i, "") : rest;
    const [pos] = await db.select().from(schema.printPositions).where(and(eq(schema.printPositions.productId, product.id), eq(schema.printPositions.code, code)));
    if (!pos) { fail(`SKU ${product.sku} 沒有位置代碼「${code}」（請先匯入「印刷區域」）`); continue; }
    if (!isMockup && ext !== ".svg") { fail("刀模請使用 SVG"); continue; }
    const url = await saveNamed("catalog", file.name, data);
    await db.update(schema.printPositions).set(isMockup ? { mockupUrl: url } : { dielineUrl: url }).where(eq(schema.printPositions.id, pos.id));
    results.push({ file: file.name, ok: true, message: isMockup ? `${pos.name} 示意圖` : `${pos.name} 刀模` });
  }
  return NextResponse.json({ results });
}
