import "server-only";

/**
 * Google / LINE 登入（OAuth 2.0 授權碼流程）。
 * 只要設定對應的環境變數，登入頁就會自動出現按鈕。
 * 回呼網址請在各平台後台設為：{網站網址}/api/auth/{google|line}/callback
 */
export type Provider = "google" | "line";

type Config = {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
};

export type Profile = { id: string; name: string; email: string | null; emailVerified: boolean };

export function providerConfig(p: string): Config | null {
  if (p === "google" && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth", tokenUrl: "https://oauth2.googleapis.com/token", scope: "openid email profile",
    };
  }
  if (p === "line" && process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET) {
    return {
      clientId: process.env.LINE_CHANNEL_ID, clientSecret: process.env.LINE_CHANNEL_SECRET,
      authorizeUrl: "https://access.line.me/oauth2/v2.1/authorize", tokenUrl: "https://api.line.me/oauth2/v2.1/token", scope: "openid profile email",
    };
  }
  return null;
}

export const enabledProviders = (): Provider[] => (["line", "google"] as const).filter((p) => providerConfig(p));

export function redirectUri(req: Request, p: string): string {
  const base = (process.env.SITE_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  return `${base}/api/auth/${p}/callback`;
}

/** LINE 不一定提供 Email，先以佔位信箱建立帳號，結帳時再請客戶填寫 */
export const placeholderEmail = (p: string, id: string) => `${p}-${id}@oauth.invalid`.toLowerCase();
export const isPlaceholderEmail = (email: string) => email.endsWith("@oauth.invalid");

export async function fetchProfile(p: Provider, cfg: Config, code: string, redirect: string): Promise<Profile> {
  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirect, client_id: cfg.clientId, client_secret: cfg.clientSecret }),
  });
  if (!tokenRes.ok) throw new Error(`token exchange failed (${tokenRes.status})`);
  const token = (await tokenRes.json()) as { access_token?: string; id_token?: string };

  if (p === "google") {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!res.ok) throw new Error("userinfo failed");
    const u = (await res.json()) as { sub?: string; name?: string; email?: string; email_verified?: boolean };
    if (!u.sub) throw new Error("no subject");
    return { id: u.sub, name: u.name || u.email || "Google", email: u.email?.toLowerCase() ?? null, emailVerified: u.email_verified === true };
  }
  // LINE：由 LINE 伺服器驗證 ID token（簽章、對象、效期）後回傳內容
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: token.id_token ?? "", client_id: cfg.clientId }),
  });
  if (!res.ok) throw new Error("id token verify failed");
  const u = (await res.json()) as { sub?: string; name?: string; email?: string };
  if (!u.sub) throw new Error("no subject");
  // LINE 的 Email 不保證已驗證，不用來合併既有帳號
  return { id: u.sub, name: u.name || "LINE", email: u.email?.toLowerCase() ?? null, emailVerified: false };
}
