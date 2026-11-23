/** 定時工作（只在 Node.js 執行環境載入） */
export function start() {
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
