import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendOrderToSupplier } from "@/lib/supplier";
import { ecpayConfig, orderNoOf, verifyMac } from "@/lib/ecpay";

export const dynamic = "force-dynamic";
const text = (s: string, status = 200) => new Response(s, { status, headers: { "Content-Type": "text/plain" } });

/**
 * 綠界的付款結果通知（伺服器對伺服器）。檢查碼正確、金額相符、交易成功才把訂單標為已付款。
 * 綠界要求成功時回「1|OK」，否則會重送。
 */
export async function POST(req: Request) {
  const cfg = ecpayConfig();
  if (!cfg) return text("0|not configured", 503);
  const p: Record<string, string> = {};
  for (const [k, v] of (await req.formData()).entries()) p[k] = String(v);
  if (!verifyMac(p, cfg.hashKey, cfg.hashIv) || p.MerchantID !== cfg.merchantId) return text("0|CheckMacValue Error", 400);
  const orderNo = p.CustomField1 || orderNoOf(p.MerchantTradeNo ?? "");
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.orderNo, orderNo));
  if (!order) return text("0|order not found", 404);
  // 模擬付款（綠界後台的測試按鈕）只在測試環境接受
  const simulated = p.SimulatePaid === "1";
  if (p.RtnCode === "1" && (!simulated || cfg.stage) && Number(p.TradeAmt) === Math.round(order.total)) {
    if (!order.paid) {
      await db.update(schema.orders)
        .set({ paid: true, paidAt: Math.floor(Date.now() / 1000), paymentMethod: `ecpay:${p.PaymentType ?? ""}`.slice(0, 60), paymentRef: (p.TradeNo ?? "").slice(0, 40), status: order.status === "pending_payment" ? "reviewing" : order.status })
        .where(eq(schema.orders.id, order.id));
      // 付款成功就自動把訂單送給供應商；不等它做完，先回應綠界（失敗原因會記在訂單上）
      void sendOrderToSupplier(order.id).catch((e) => console.error("[supplier] auto send failed", order.orderNo, e));
    }
  }
  return text("1|OK");
}
