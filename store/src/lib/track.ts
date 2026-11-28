"use client";
/** 送出 GA4／Google Ads 事件。沒有安裝追蹤碼時什麼都不做 */
export function track(event: string, params: Record<string, unknown> = {}) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  try { w.gtag?.("event", event, params); } catch { /* 追蹤失敗不影響購物 */ }
}

type Fbq = (...a: unknown[]) => void;
const newEventId = () => { try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; } };

/**
 * 送出 Meta 像素事件。像素是延後載入的，還沒就緒時等一下再送；沒有安裝像素就什麼都不做。
 * 每個事件都帶 eventID（沒指定就自動產生），伺服器端若送同一筆事件要用同一個 ID 才會去重。
 */
export function metaTrack(event: string, params: Record<string, unknown> = {}, eventID: string = newEventId(), custom = false) {
  let tries = 0;
  const send = () => {
    const fbq = (window as unknown as { fbq?: Fbq }).fbq;
    if (typeof fbq !== "function") { if (++tries < 20) setTimeout(send, 300); return; }
    try { fbq(custom ? "trackCustom" : "track", event, params, { eventID }); } catch { /* 追蹤失敗不影響購物 */ }
  };
  send();
}
