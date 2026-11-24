import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { keyQs, orderFor } from "@/lib/order-access";
import { checkoutFields, ecpayConfig, siteOrigin } from "@/lib/ecpay";

export const dynamic = "force-dynamic";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** 產生送往綠界的付款表單並自動送出。只有訂單本人、且訂單尚未付款時才會產生 */
export async function GET(req: Request) {
  const cfg = ecpayConfig();
  const orderNo = new URL(req.url).searchParams.get("orderNo") ?? "";
  const order = await orderFor(orderNo, new URL(req.url).searchParams.get("key"));
  if (!order) return Response.redirect(`${siteOrigin(req)}/login?next=${encodeURIComponent(`/orders/${orderNo}`)}`, 302);
  if (!cfg || order.paid || order.status !== "pending_payment") return Response.redirect(`${siteOrigin(req)}/orders/${encodeURIComponent(orderNo)}${keyQs(order)}`, 302);
  const items = await db.select({ name: schema.orderItems.name, qty: schema.orderItems.qty }).from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  const fields = checkoutFields(cfg, { orderNo: order.orderNo, total: order.total, itemName: items.map((i) => `${i.name} x ${i.qty}`).join("#") || order.orderNo, origin: siteOrigin(req), key: order.accessKey });
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>前往付款</title></head>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#111">
<form id="f" method="post" action="${esc(cfg.action)}">${Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(String(v))}">`).join("")}
<p>正在前往綠界付款頁面…</p><noscript><button type="submit">前往付款</button></noscript></form>
<script>document.getElementById("f").submit()</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
