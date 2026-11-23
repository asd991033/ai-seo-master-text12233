"use client";
import { useEffect } from "react";
import { track } from "@/lib/track";

type Props = { orderNo: string; value: number; shipping: number; currency: string; adsSendTo: string | null; items: { item_id: string; item_name: string; quantity: number; price: number }[] };

/** 訂單付款成功後送出一次「購買」轉換（GA4 purchase ＋ Google Ads 轉換）。同一張訂單只送一次 */
export function PurchaseEvent({ orderNo, value, shipping, currency, adsSendTo, items }: Props) {
  useEffect(() => {
    const key = `purchase-sent:${orderNo}`;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch { /* 無法記錄就照送 */ }
    // 追蹤碼是延後載入的，等它就緒再送
    let tries = 0;
    const timer = setInterval(() => {
      const ready = typeof (window as unknown as { gtag?: unknown }).gtag === "function";
      if (!ready && ++tries < 20) return;
      clearInterval(timer);
      track("purchase", { transaction_id: orderNo, value, currency, shipping, items });
      if (adsSendTo) track("conversion", { send_to: adsSendTo, value, currency, transaction_id: orderNo });
    }, 300);
    return () => clearInterval(timer);
  }, [orderNo, value, shipping, currency, adsSendTo, items]);
  return null;
}
