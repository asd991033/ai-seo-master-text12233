import { stripeConfig, verifyWebhook } from "@/lib/stripe";
import { applySession, webhookSecret, type StripeSession } from "@/lib/stripe-sync";

export const dynamic = "force-dynamic";
const text = (s: string, status = 200) => new Response(s, { status, headers: { "Content-Type": "text/plain" } });

/**
 * Stripe 的付款結果通知。簽章正確、已付款、金額與幣別都相符才把訂單標為已付款。
 * 端點由網站啟動時自動到 Stripe 建立（見 stripe-sync.ts 的 ensureWebhook）；也可以自行設定 STRIPE_WEBHOOK_SECRET。
 */
export async function POST(req: Request) {
  if (!stripeConfig()) return text("not configured", 503);
  const secret = await webhookSecret();
  if (!secret) return text("not configured", 503);
  const payload = await req.text();
  if (!verifyWebhook(payload, req.headers.get("stripe-signature"), secret)) return text("bad signature", 400);
  const event = JSON.parse(payload) as { type?: string; data?: { object?: StripeSession } };
  const s = event.data?.object;
  if (!s || !["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type ?? "")) return text("ignored");
  await applySession(s);
  return text("ok");
}
