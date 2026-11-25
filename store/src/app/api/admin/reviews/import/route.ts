import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { importReviews, parseReviewWorkbook } from "@/lib/reviews";

export async function POST(req: Request) {
  const user = await getUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File) || !/\.(xlsx|xlsm|csv|txt|xls)$/i.test(file.name)) return NextResponse.json({ ok: false, errors: ["請上傳 .xlsx 或 .csv 檔案"] }, { status: 400 });
  let parsed;
  try {
    parsed = await parseReviewWorkbook(await file.arrayBuffer());
  } catch (e) {
    console.error("[reviews/import] 讀取失敗", file.name, file.size, e);
    return NextResponse.json({ ok: false, errors: [`無法讀取檔案（${e instanceof Error ? e.message : String(e)}）。請用 Excel「另存新檔」成 .xlsx 或 CSV 後再上傳`] }, { status: 400 });
  }
  if (parsed.errors.length) return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 400 });
  const result = await importReviews(parsed.rows, file.name);
  if (result.ok) revalidatePath("/", "layout");
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
