import { promises as fs } from "fs";
import path from "path";
import { gunzipSync } from "zlib";

export const dynamic = "force-dynamic";

/** 供應商（HiCustom）排版器的設定：印刷面、刀模、效果圖的貼圖方式。排版器照這份資料呈現，才能和供應商下單時一致 */
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase().replace(/^HC-/, "");
  if (!/^[A-Z0-9]{4,10}$/.test(code)) return Response.json({ error: "bad code" }, { status: 400 });
  try {
    const buf = await fs.readFile(path.join(process.cwd(), "catalog", "hc-design", `${code}.json.gz`));
    return new Response(gunzipSync(buf), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
  } catch {
    // 沒有供應商資料的商品回 null（不是錯誤），排版器會改用一般模式
    return Response.json(null);
  }
}
