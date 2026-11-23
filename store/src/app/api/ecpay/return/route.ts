import { siteOrigin } from "@/lib/ecpay";

export const dynamic = "force-dynamic";

/** 付款完成後，綠界把客戶的瀏覽器導回這裡（POST）。只負責轉回訂單頁；是否已付款以伺服器通知為準 */
export async function POST(req: Request) {
  let orderNo = "";
  try { const fd = await req.formData(); orderNo = String(fd.get("CustomField1") ?? "").replace(/[^0-9A-Za-z-]/g, "").slice(0, 30); } catch { /* 沒帶資料就回訂單列表 */ }
  return Response.redirect(`${siteOrigin(req)}${orderNo ? `/orders/${orderNo}?paid=1` : "/account"}`, 303);
}
export const GET = POST;
