/** GA 追蹤用的純函式（可單獨測試） */
/** 從 Cookie 取出 GA 用戶代碼（_ga=GA1.1.111.222 → 111.222）、工作階段與 Google Ads 點擊代碼（_gcl_aw=GCL.時間.gclid） */
export function trackingFromCookies(cookie: string | null, measurementId = process.env.GA_ID ?? "") {
  const jar = new Map((cookie ?? "").split(";").map((x) => { const i = x.indexOf("="); return [x.slice(0, i).trim(), decodeURIComponent(x.slice(i + 1).trim())] as [string, string]; }));
  const ga = /^GA\d\.\d\.(\d+\.\d+)$/.exec(jar.get("_ga") ?? "")?.[1] ?? null;
  const sess = jar.get(`_ga_${measurementId.replace(/^G-/, "")}`) ?? "";
  // 舊格式 GS1.1.<session>.…；新格式 GS2.1.s<session>$o…
  const sid = /^GS1\.\d\.(\d+)/.exec(sess)?.[1] ?? /^GS2\.\d\.s(\d+)/.exec(sess)?.[1] ?? null;
  const gclid = /^GCL\.\d+\.([\w-]+)$/.exec(jar.get("_gcl_aw") ?? "")?.[1] ?? null;
  return { gaClientId: ga, gaSessionId: sid, gclid: gclid ? gclid.slice(0, 200) : null };
}

type PurchaseOrder = { orderNo: string; total: number; shippingFee: number; currency: string; gaClientId: string | null; gaSessionId: string | null; gclid: string | null };
type PurchaseItem = { sku: string; name: string; qty: number; unitPrice: number };

/** GA4 Measurement Protocol 的 purchase 事件內容（與瀏覽器端送的欄位一致） */
export function purchasePayload(o: PurchaseOrder, items: PurchaseItem[]) {
  return {
    client_id: o.gaClientId ?? `server.${o.orderNo}`,
    events: [{
      name: "purchase",
      params: {
        transaction_id: o.orderNo, value: o.total, currency: o.currency, shipping: o.shippingFee, engagement_time_msec: 1,
        ...(o.gaSessionId ? { session_id: o.gaSessionId } : {}), ...(o.gclid ? { gclid: o.gclid } : {}),
        items: items.map((i) => ({ item_id: i.sku, item_name: i.name, quantity: i.qty, price: i.unitPrice })),
      },
    }],
  };
}
