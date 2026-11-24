"use client";
import { useEffect } from "react";
import { track } from "@/lib/track";

export type UserData = { email?: string; phone_number?: string; address?: { first_name?: string; street?: string; city?: string; region?: string; postal_code?: string; country?: string } };
type Props = {
  orderNo: string; accessKey: string | null; value: number; shipping: number; currency: string; adsSendTo: string | null;
  /** 伺服器已經補送過這張訂單的轉換，瀏覽器就不再送 */
  tracked: boolean;
  /** 加強型轉換用的客戶資料（gtag 會先雜湊再送給 Google） */
  userData: UserData;
  items: { item_id: string; item_name: string; quantity: number; price: number }[];
};

/** 訂單付款成功後送出一次「購買」轉換（GA4 purchase ＋ Google Ads 轉換）。同一張訂單只送一次 */
export function PurchaseEvent({ orderNo, accessKey, value, shipping, currency, adsSendTo, tracked, userData, items }: Props) {
  useEffect(() => {
    if (tracked) return;
    const key = `purchase-sent:${orderNo}`;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch { /* 無法記錄就照送 */ }
    // 追蹤碼是延後載入的，等它就緒再送
    let tries = 0;
    const timer = setInterval(() => {
      const w = window as unknown as { gtag?: (...a: unknown[]) => void };
      const ready = typeof w.gtag === "function";
      if (!ready && ++tries < 20) return;
      clearInterval(timer);
      if (!ready) return; // 追蹤碼被擋掉：不回報，交給伺服器補送
      try { w.gtag!("set", "user_data", userData); } catch { /* 不影響購物 */ }
      track("purchase", { transaction_id: orderNo, value, currency, shipping, items });
      if (adsSendTo) track("conversion", { send_to: adsSendTo, value, currency, transaction_id: orderNo });
      void fetch("/api/track/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNo, key: accessKey }), keepalive: true }).catch(() => {});
    }, 300);
    return () => clearInterval(timer);
  }, [orderNo, accessKey, value, shipping, currency, adsSendTo, tracked, userData, items]);
  return null;
}
