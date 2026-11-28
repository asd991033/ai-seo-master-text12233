import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { AI_STYLES } from "./ai-styles";

/**
 * AI 設計：呼叫 Google Gemini 的圖片模型（Nano Banana）。環境變數：
 *   AI_IMAGE_API_KEY：Gemini API 金鑰（沒設定時整個功能不顯示）
 *   AI_IMAGE_MODEL：模型代號，預設 gemini-3.1-flash-image
 *   AI_IMAGE_API_BASE：API 位址，預設 https://generativelanguage.googleapis.com/v1beta
 *   AI_LIMIT_GUEST / AI_LIMIT_MEMBER：未登入／會員每天可生成幾張（預設 3／10）
 *   AI_DAILY_CAP：全站每天最多生成幾張，超過就暫停到隔天（預設 200）
 */
export const aiConfig = () => {
  const key = process.env.AI_IMAGE_API_KEY?.trim();
  if (!key) return null;
  const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && v?.trim() ? Math.max(0, Math.floor(Number(v))) : d);
  return {
    key,
    model: process.env.AI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image",
    base: (process.env.AI_IMAGE_API_BASE?.trim() || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, ""),
    guest: num(process.env.AI_LIMIT_GUEST, 3), member: num(process.env.AI_LIMIT_MEMBER, 10), cap: num(process.env.AI_DAILY_CAP, 200),
  };
};

export class AiError extends Error {
  constructor(public code: "blocked" | "refused" | "limit" | "cap" | "provider" | "input", message: string) { super(message); }
}

/** 明顯的品牌與角色名稱：這些圖案印在商品上有侵權風險，直接擋下 */
const BLOCKED = /disney|迪士尼|mickey|米奇|米老鼠|minnie|pixar|皮克斯|marvel|漫威|avengers|復仇者|spider-?man|蜘蛛人|iron ?man|鋼鐵人|batman|蝙蝠俠|superman|超人力霸王|pok[eé]mon|寶可夢|神奇寶貝|pikachu|皮卡丘|hello ?kitty|凱蒂貓|sanrio|三麗鷗|doraemon|哆啦a夢|小叮噹|snoopy|史努比|studio ghibli|ghibli|吉卜力|totoro|龍貓|one ?piece|海賊王|航海王|naruto|火影|demon slayer|鬼滅|star ?wars|星際大戰|harry potter|哈利波特|minions?|小小兵|line friends|熊大|兔兔|kakao|barbie|芭比|nintendo|任天堂|mario|瑪利歐|zelda|薩爾達|nike|adidas|gucci|chanel|louis vuitton|\blv\b|supreme|coca-?cola|可口可樂|starbucks|星巴克/i;
export const promptBlocked = (text: string) => BLOCKED.test(text);

const today = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // 以台北時間換日
export const whoOf = (userId: number | null, ip: string) => (userId ? `user:${userId}` : `ip:${createHash("sha256").update(ip || "unknown").digest("hex").slice(0, 24)}`);

async function countOf(who: string, day: string): Promise<number> {
  const [row] = await db.select({ n: schema.aiUsage.count }).from(schema.aiUsage).where(and(eq(schema.aiUsage.who, who), eq(schema.aiUsage.day, day)));
  return row?.n ?? 0;
}

/** 這個人今天還能生成幾張（同時考慮全站每日上限） */
export async function aiQuota(who: string, isMember: boolean): Promise<{ limit: number; used: number; remaining: number; capReached: boolean }> {
  const cfg = aiConfig();
  if (!cfg) return { limit: 0, used: 0, remaining: 0, capReached: false };
  const day = today(), limit = isMember ? cfg.member : cfg.guest;
  const [used, total] = await Promise.all([countOf(who, day), countOf("all", day)]);
  const capReached = total >= cfg.cap;
  return { limit, used, remaining: capReached ? 0 : Math.max(0, limit - used), capReached };
}

async function bump(who: string) {
  const day = today();
  for (const w of [who, "all"]) {
    await db.insert(schema.aiUsage).values({ who: w, day, count: 1 }).onConflictDoUpdate({ target: [schema.aiUsage.who, schema.aiUsage.day], set: { count: sql`${schema.aiUsage.count} + 1` } });
  }
}

export type AiRequest = { mode: "style" | "text"; styleId: string; prompt: string; image: Buffer | null };

/** 生成一張圖並計入用量；失敗（被擋、被模型拒絕、服務出錯）不扣次數 */
export async function generateAiImage(req: AiRequest, who: string, isMember: boolean): Promise<Buffer> {
  const cfg = aiConfig();
  if (!cfg) throw new AiError("provider", "AI is not configured");
  const style = AI_STYLES.find((s) => s.id === req.styleId) ?? null;
  const userText = req.prompt.trim();
  // 照片模式：要有照片，而且至少選了風格或寫了想怎麼改
  if (req.mode === "style" && (!req.image || (!style && !userText))) throw new AiError("input", "missing image, style or instruction");
  if (req.mode === "text" && !userText) throw new AiError("input", "missing prompt");
  if (userText && promptBlocked(userText)) throw new AiError("blocked", "blocked term");
  const quota = await aiQuota(who, isMember);
  if (quota.capReached) throw new AiError("cap", "daily cap reached");
  if (quota.remaining <= 0) throw new AiError("limit", "limit reached");

  const tail = "The result will be printed on merchandise: keep the subject large, centred and fully inside the frame. Do not add any text, letters, signatures, watermarks, logos or brand names. Do not depict copyrighted characters or real brand marks.";
  const parts: Record<string, unknown>[] = [];
  if (req.mode === "style") {
    // 手機照片很大，縮到 1536px 再送（省費用，也比較快）
    const jpeg = await sharp(req.image!, { failOn: "none" }).rotate().resize(1536, 1536, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 88 }).toBuffer().catch(() => { throw new AiError("input", "unreadable image"); });
    const text = style
      ? `Redraw this photo as ${style.prompt}. Keep the same subjects, their identity, pose, proportions and overall composition; change only the artistic style.${userText ? ` Also apply this change requested by the customer: ${userText}.` : " Use a clean, simple background."}`
      : `Edit this photo exactly as the customer asks: ${userText}. Keep the subjects' identity and everything the request does not mention unchanged, and keep the photo's original style.`;
    parts.push({ text: `${text} ${tail}` });
    parts.push({ inlineData: { mimeType: "image/jpeg", data: jpeg.toString("base64") } });
  } else {
    parts.push({ text: `Create an original illustration: ${userText}.${style ? ` Art style: ${style.prompt}.` : ""} Use a plain white background. ${tail}` });
  }

  let res: Response;
  try {
    res = await fetch(`${cfg.base}/models/${encodeURIComponent(cfg.model)}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.key },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"] } }),
      signal: AbortSignal.timeout(110_000),
    });
  } catch (e) {
    throw new AiError("provider", `network: ${(e as Error).message}`);
  }
  const text = await res.text();
  if (!res.ok) throw new AiError(res.status === 400 && /safety|blocked|policy/i.test(text) ? "refused" : "provider", `HTTP ${res.status}: ${text.slice(0, 300)}`);
  let data: string | undefined;
  try {
    const json = JSON.parse(text) as { candidates?: { content?: { parts?: { inlineData?: { data?: string }; inline_data?: { data?: string } }[] } }[] };
    for (const p of json.candidates?.[0]?.content?.parts ?? []) data ??= p.inlineData?.data ?? p.inline_data?.data;
  } catch { /* 下面當成沒有圖處理 */ }
  // 模型沒有回傳圖片，多半是內容被安全機制擋下
  if (!data) throw new AiError("refused", `no image in response: ${text.slice(0, 200)}`);
  const png = await sharp(Buffer.from(data, "base64")).png().toBuffer().catch(() => { throw new AiError("provider", "invalid image data"); });
  await bump(who);
  return png;
}
