/**
 * 伺服器啟動時註冊定時工作：每 30 分鐘向供應商同步訂單狀態與物流單號，
 * 並補送「已付款但還沒送到供應商」的訂單。
 */
export async function register() {
  // 必須寫成正向判斷，打包 middleware（Edge 環境）時才不會把 Node 專用的模組一起打包進去
  if (process.env.NEXT_RUNTIME === "nodejs") (await import("./instrumentation-node")).start();
}
