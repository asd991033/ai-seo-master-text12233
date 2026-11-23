"use client";
/** 送出 GA4／Google Ads 事件。沒有安裝追蹤碼時什麼都不做 */
export function track(event: string, params: Record<string, unknown> = {}) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  try { w.gtag?.("event", event, params); } catch { /* 追蹤失敗不影響購物 */ }
}
