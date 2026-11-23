/**
 * 伺服器啟動時註冊定時工作：每 30 分鐘向供應商同步訂單狀態與物流單號，
 * 並補送「已付款但還沒送到供應商」的訂單。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as unknown as { __supplierTimer?: ReturnType<typeof setInterval> };
  if (g.__supplierTimer) return;
  const run = async () => {
    try {
      const { sendPendingToSupplier, syncAllFromSupplier } = await import("@/lib/supplier");
      const sent = await sendPendingToSupplier(), synced = await syncAllFromSupplier();
      if (sent || synced) console.log(`[supplier] sent ${sent}, synced ${synced}`);
    } catch (e) {
      console.error("[supplier] scheduled job failed", e);
    }
  };
  g.__supplierTimer = setInterval(run, 30 * 60 * 1000);
  setTimeout(run, 60 * 1000);
}
