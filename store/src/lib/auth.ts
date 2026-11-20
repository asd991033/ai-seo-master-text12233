import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db, schema } from "@/db";

const COOKIE = "sid";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

const tokenId = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  await db.insert(schema.sessions).values({ id: tokenId(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, tokenId(token)));
  jar.delete(COOKIE);
}

export type SessionUser = { id: number; email: string; name: string; phone: string | null; company: string | null; taxId: string | null; role: "customer" | "admin" };

export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      phone: schema.users.phone,
      company: schema.users.company,
      taxId: schema.users.taxId,
      role: schema.users.role,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, tokenId(token)), gt(schema.sessions.expiresAt, Math.floor(Date.now() / 1000))))
    .limit(1);
  return rows[0] ?? null;
}

/** 只允許站內相對路徑，避免 open redirect */
export function safeNext(next: unknown, fallback = "/account"): string {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : fallback;
}

export async function requireUser(next = "/account"): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser("/admin");
  if (u.role !== "admin") redirect("/");
  return u;
}
