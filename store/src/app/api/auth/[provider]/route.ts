import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { safeNext } from "@/lib/auth";
import { providerConfig, redirectUri } from "@/lib/oauth";

/** 導向 Google / LINE 授權頁 */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const cfg = providerConfig(provider);
  if (!cfg) return new Response("Not found", { status: 404 });
  const state = randomBytes(24).toString("base64url");
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const url = new URL(cfg.authorizeUrl);
  url.search = new URLSearchParams({ response_type: "code", client_id: cfg.clientId, redirect_uri: redirectUri(req, provider), scope: cfg.scope, state }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", JSON.stringify({ state, next, provider }), {
    httpOnly: true, sameSite: "lax", path: "/api/auth", maxAge: 600,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
  });
  return res;
}
