import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { parseWorkbook } from "@/lib/excel";
import { importCatalog } from "@/lib/importer";

export async function POST(req: Request) {
  const user = await getUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File) || !/\.xlsx$/i.test(file.name)) return NextResponse.json({ ok: false, errors: ["請上傳 .xlsx 檔案"] }, { status: 400 });
  let parsed;
  try {
    parsed = await parseWorkbook(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ ok: false, errors: ["無法讀取檔案，請確認是有效的 .xlsx"] }, { status: 400 });
  }
  if (parsed.errors.length) return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 400 });
  const result = await importCatalog(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
