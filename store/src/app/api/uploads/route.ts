import { NextResponse } from "next/server";
import path from "node:path";
import { saveRandom } from "@/lib/storage";

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
const ARTWORK_EXT = [...IMAGE_EXT, ".pdf", ".ai", ".eps", ".psd", ".zip"];
const MB = 1024 * 1024;

function looksLike(ext: string, b: Buffer): boolean {
  const head = b.subarray(0, 12);
  switch (ext) {
    case ".png": return head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    case ".jpg":
    case ".jpeg": return head[0] === 0xff && head[1] === 0xd8;
    case ".webp": return head.subarray(0, 4).toString() === "RIFF" && head.subarray(8, 12).toString() === "WEBP";
    case ".svg": return /<svg[\s>]/i.test(b.subarray(0, 4096).toString("utf8"));
    default: return true;
  }
}

/** 客戶上傳：kind=image（排版用圖片）或 kind=artwork（現成稿件） */
export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  const kind = fd?.get("kind") === "artwork" ? "artwork" : "image";
  if (!(file instanceof File)) return NextResponse.json({ error: "未收到檔案" }, { status: 400 });
  const ext = path.extname(file.name).toLowerCase();
  const allowed = kind === "artwork" ? ARTWORK_EXT : IMAGE_EXT;
  const limit = (kind === "artwork" ? 50 : 15) * MB;
  if (!allowed.includes(ext)) return NextResponse.json({ error: `不支援的檔案格式（${allowed.join(" ")}）` }, { status: 400 });
  if (file.size > limit) return NextResponse.json({ error: `檔案過大（上限 ${limit / MB}MB）` }, { status: 400 });
  const data = Buffer.from(await file.arrayBuffer());
  if (!looksLike(ext, data)) return NextResponse.json({ error: "檔案內容與副檔名不符" }, { status: 400 });
  try {
    const url = await saveRandom(kind === "artwork" ? "artwork" : "uploads", ext, data);
    return NextResponse.json({ url });
  } catch (e) {
    // 存檔失敗（例如磁碟空間不足）也要回 JSON，前端才顯示得出看得懂的訊息
    console.error("[uploads] save failed", file.name, file.size, e);
    return NextResponse.json({ error: "檔案暫時無法儲存，請稍後再試。問題持續的話請聯絡我們。" }, { status: 507 });
  }
}
