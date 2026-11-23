"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createSession, destroySession, hashPassword, safeNext, verifyPassword } from "@/lib/auth";
import { dictFor } from "@/i18n";
import { initMarket } from "@/market/server";
import { localize } from "@/config/markets";

export type FormState = { error?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const m = await initMarket(), t = dictFor(m);
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (user && user.passwordHash.startsWith("oauth$")) return { error: t.auth.useSocial };
  if (!user || !verifyPassword(password, user.passwordHash)) return { error: t.auth.badLogin };
  await createSession(user.id);
  redirect(safeNext(fd.get("next"), user.role === "admin" ? "/admin" : localize("/account", m)));
}

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const m = await initMarket(), t = dictFor(m);
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const name = str(fd, "name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) return { error: t.auth.invalid };
  if (password.length < 8) return { error: t.auth.weakPassword };
  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (exists) return { error: t.auth.emailTaken };
  const [user] = await db
    .insert(schema.users)
    .values({ email, passwordHash: hashPassword(password), name, phone: str(fd, "phone") || null, company: str(fd, "company") || null })
    .returning();
  await createSession(user.id);
  redirect(safeNext(fd.get("next"), localize("/account", m)));
}

export async function logoutAction() {
  const m = await initMarket();
  await destroySession();
  redirect(m.prefix || "/");
}
