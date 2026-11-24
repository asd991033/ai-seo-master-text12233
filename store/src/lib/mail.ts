import "server-only";

/**
 * 寄信（Resend 的 REST API）。環境變數：
 *   RESEND_API_KEY：API 金鑰；MAIL_FROM：寄件人，例 Kindmark <hello@kindmarkz.com>（網域需先在 Resend 驗證）
 *   MAIL_REPLY_TO：客戶回信的信箱（選填）
 */
export const mailConfig = () => {
  const key = process.env.RESEND_API_KEY?.trim(), from = process.env.MAIL_FROM?.trim();
  return key && from ? { key, from, replyTo: process.env.MAIL_REPLY_TO?.trim() || undefined, url: process.env.MAIL_API_URL?.trim() || "https://api.resend.com/emails" } : null;
};
export const mailEnabled = () => !!mailConfig();

export async function sendMail(m: { to: string; subject: string; html: string; text: string; headers?: Record<string, string> }): Promise<void> {
  const cfg = mailConfig();
  if (!cfg) throw new Error("Mail is not configured");
  const res = await fetch(cfg.url, {
    method: "POST", headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: cfg.from, to: [m.to], subject: m.subject, html: m.html, text: m.text, ...(cfg.replyTo ? { reply_to: cfg.replyTo } : {}), ...(m.headers ? { headers: m.headers } : {}) }),
  });
  if (!res.ok) throw new Error(`Mail HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
