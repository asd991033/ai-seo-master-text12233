import "server-only";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * 檔案儲存抽象層。目前存在本機磁碟（STORAGE_DIR），由 /files/* 路由提供下載。
 * 正式環境若使用無狀態主機（如 Vercel），把這三個函式改接 S3 / R2 即可。
 */
const ROOT = path.resolve(process.env.STORAGE_DIR ?? "./data/files");

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".ai": "application/postscript",
  ".eps": "application/postscript",
  ".psd": "image/vnd.adobe.photoshop",
  ".zip": "application/zip",
};

export const mimeOf = (file: string) => MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";

function resolveSafe(rel: string): string {
  const full = path.resolve(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) throw new Error("invalid path");
  return full;
}

/** 以指定檔名存檔（後台批量匯入刀模、商品圖用），回傳公開網址 */
export async function saveNamed(dir: string, filename: string, data: Buffer): Promise<string> {
  const clean = path.basename(filename).replace(/[^\w.\-一-鿿]+/g, "_");
  const full = resolveSafe(path.join(dir, clean));
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return `/files/${dir}/${encodeURIComponent(clean)}`;
}

/** 以隨機檔名存檔（客戶上傳、設計稿輸出用） */
export async function saveRandom(dir: string, ext: string, data: Buffer): Promise<string> {
  return saveNamed(dir, `${randomBytes(12).toString("hex")}${ext}`, data);
}

export async function readStored(relParts: string[]): Promise<{ data: Buffer; mime: string } | null> {
  try {
    const full = resolveSafe(path.join(...relParts));
    if (!(await stat(full)).isFile()) return null;
    return { data: await readFile(full), mime: mimeOf(full) };
  } catch {
    return null;
  }
}

/** 解析 data URL（僅接受白名單內的型別） */
export function parseDataUrl(dataUrl: string, allowed: Record<string, string>): { ext: string; data: Buffer } | null {
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m || !allowed[m[1]]) return null;
  return { ext: allowed[m[1]], data: Buffer.from(m[2], "base64") };
}
