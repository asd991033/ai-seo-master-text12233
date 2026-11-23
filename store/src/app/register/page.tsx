import type { Metadata } from "next";
import { localize } from "@/config/markets";
import { initMarket } from "@/market/server";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { getUser, safeNext } from "@/lib/auth";
import { enabledProviders } from "@/lib/oauth";
import { AuthForm } from "@/components/AuthForm";

export async function generateMetadata(): Promise<Metadata> {
  await initMarket();
  return { title: t.auth.register };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const m = await initMarket();
  const { next, error } = await searchParams;
  if (await getUser()) redirect(safeNext(next, localize("/account", m)));
  return <AuthForm mode="register" next={next ? safeNext(next) : undefined} providers={enabledProviders()} oauthError={error === "oauth"} />;
}
