import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { getUser, safeNext } from "@/lib/auth";
import { enabledProviders } from "@/lib/oauth";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: t.auth.register };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getUser()) redirect(safeNext(next));
  return <AuthForm mode="register" next={next ? safeNext(next) : undefined} providers={enabledProviders()} oauthError={error === "oauth"} />;
}
