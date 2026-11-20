import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createSession, safeNext } from "@/lib/auth";
import { fetchProfile, placeholderEmail, providerConfig, redirectUri, type Provider } from "@/lib/oauth";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const cfg = providerConfig(provider);
  if (!cfg) return new Response("Not found", { status: 404 });
  const q = new URL(req.url).searchParams;
  const jar = await cookies();
  let saved: { state?: string; next?: string; provider?: string } = {};
  try { saved = JSON.parse(jar.get("oauth_state")?.value ?? "{}"); } catch { /* 視為無效 */ }
  jar.delete({ name: "oauth_state", path: "/api/auth" });

  const code = q.get("code");
  const state = q.get("state") ?? "";
  // state 必須與發起登入時寫入的 cookie 相符（防 CSRF）
  if (!code || !saved.state || saved.provider !== provider || !same(state, saved.state)) redirect("/login?error=oauth");

  let userId: number;
  try {
    const profile = await fetchProfile(provider as Provider, cfg, code, redirectUri(req, provider));
    const { users, oauthAccounts } = schema;
    const [linked] = await db.select().from(oauthAccounts).where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, profile.id)));
    if (linked) userId = linked.userId;
    else {
      // 只有「已驗證」的 Email 才併入既有帳號，避免被冒用 Email 接管
      const [byEmail] = profile.email && profile.emailVerified ? await db.select().from(users).where(eq(users.email, profile.email)) : [];
      if (byEmail) userId = byEmail.id;
      else {
        const [taken] = profile.email ? await db.select({ id: users.id }).from(users).where(eq(users.email, profile.email)) : [];
        const email = profile.email && !taken ? profile.email : placeholderEmail(provider, profile.id);
        const [created] = await db.insert(users).values({ email, name: profile.name.slice(0, 80), passwordHash: "oauth$" }).returning();
        userId = created.id;
      }
      await db.insert(oauthAccounts).values({ provider, providerUserId: profile.id, userId });
    }
  } catch (e) {
    console.error(`[oauth:${provider}]`, (e as Error).message);
    redirect("/login?error=oauth");
  }
  await createSession(userId);
  redirect(safeNext(saved.next));
}
