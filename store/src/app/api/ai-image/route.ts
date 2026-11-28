import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { readStored, saveRandom } from "@/lib/storage";
import { AiError, aiConfig, aiQuota, generateAiImage, whoOf } from "@/lib/ai-image";
import { AI_PROMPT_MAX, AI_STYLES } from "@/lib/ai-styles";

export const maxDuration = 120;
const MB = 1024 * 1024;

const ipOf = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

/** 設計器開啟時查詢：功能有沒有開、今天還能生成幾張 */
export async function GET(req: Request) {
  if (!aiConfig()) return NextResponse.json({ enabled: false });
  const user = await getUser();
  const q = await aiQuota(whoOf(user?.id ?? null, ipOf(req)), !!user);
  return NextResponse.json({ enabled: true, limit: q.limit, remaining: q.remaining, member: !!user, styles: AI_STYLES.map(({ id, zh, en }) => ({ id, zh, en })) });
}

const MESSAGES: Record<AiError["code"], [string, number]> = {
  blocked: ["描述裡有品牌或角色名稱，這類圖案無法生成。請換一個描述。", 400],
  refused: ["這個內容無法生成，請換一張圖片或換個描述再試。", 422],
  limit: ["今天的 AI 生成次數已用完，明天再來。登入會員可以用更多次。", 429],
  cap: ["AI 設計今天的使用量已滿，請明天再試。", 429],
  provider: ["AI 服務暫時無法使用，請稍後再試。", 502],
  input: ["請提供照片，並選一個風格或寫下想怎麼改。", 400],
};

/** 生成一張圖：mode=style（照片換風格，需 file 或 imageUrl）或 mode=text（文字生圖，需 prompt） */
export async function POST(req: Request) {
  if (!aiConfig()) return NextResponse.json({ error: "AI 設計尚未開放" }, { status: 404 });
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: MESSAGES.input[0] }, { status: 400 });
  const mode = fd.get("mode") === "text" ? "text" : "style";
  const styleId = String(fd.get("style") ?? "");
  const prompt = String(fd.get("prompt") ?? "").slice(0, AI_PROMPT_MAX);
  let image: Buffer | null = null;
  const file = fd.get("file"), imageUrl = String(fd.get("imageUrl") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > 15 * MB) return NextResponse.json({ error: "圖片過大（上限 15MB）" }, { status: 400 });
    image = Buffer.from(await file.arrayBuffer());
  } else if (imageUrl) {
    // 只接受本站已上傳的圖（畫布上選取的圖片）
    const m = /\/files\/uploads\/([A-Za-z0-9._-]+)$/.exec(imageUrl.split("?")[0]);
    image = m ? (await readStored(["uploads", m[1]]))?.data ?? null : null;
    if (!image) return NextResponse.json({ error: "找不到這張圖片，請重新上傳" }, { status: 400 });
  }
  const user = await getUser();
  const who = whoOf(user?.id ?? null, ipOf(req));
  try {
    const png = await generateAiImage({ mode, styleId, prompt, image }, who, !!user);
    const url = await saveRandom("uploads", ".png", png);
    const q = await aiQuota(who, !!user);
    return NextResponse.json({ url, remaining: q.remaining, limit: q.limit });
  } catch (e) {
    if (e instanceof AiError) {
      if (e.code === "provider" || e.code === "refused") console.error("[ai-image]", e.code, e.message);
      const [error, status] = MESSAGES[e.code];
      return NextResponse.json({ error, code: e.code }, { status });
    }
    console.error("[ai-image] failed", e);
    return NextResponse.json({ error: MESSAGES.provider[0] }, { status: 500 });
  }
}
