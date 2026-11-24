/** 定時工作（只在 Node.js 執行環境載入） */
export function start() {
  const g = globalThis as unknown as { __supplierTimer?: ReturnType<typeof setInterval> };
  if (g.__supplierTimer) return;
  const run = async () => {
    try {
      // 先補查 Stripe 的付款結果，剛確認付款的訂單才能接著送給供應商
      const { syncStripePayments } = await import("@/lib/stripe-sync");
      const paid = await syncStripePayments();
      if (paid) console.log(`[stripe] confirmed ${paid} payment(s)`);
      const { sendPendingToSupplier, syncAllFromSupplier } = await import("@/lib/supplier");
      const sent = await sendPendingToSupplier(), synced = await syncAllFromSupplier();
      if (sent || synced) console.log(`[supplier] sent ${sent}, synced ${synced}`);
    } catch (e) {
      console.error("[supplier] scheduled job failed", e);
    }
  };
  // 啟動後自動確認 Stripe 的付款通知端點已建立
  setTimeout(async () => {
    try {
      const origin = (process.env.SITE_URL ?? "").replace(/\/$/, "");
      const { ensureWebhook } = await import("@/lib/stripe-sync");
      const r = await ensureWebhook(origin);
      if (r !== "skipped") console.log(`[stripe] webhook endpoint ${r}`);
    } catch (e) {
      console.error("[stripe] webhook setup failed", e);
    }
  }, 15 * 1000);
  g.__supplierTimer = setInterval(run, 30 * 60 * 1000);
  setTimeout(run, 60 * 1000);
}
