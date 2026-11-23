"use client";
import Link from "next/link";
import { useActionState } from "react";
import { t } from "@/i18n";
import { loginAction, registerAction } from "@/app/actions";

export function AuthForm({ mode, next, providers = [], oauthError }: { mode: "login" | "register"; next?: string; providers?: ("google" | "line")[]; oauthError?: boolean }) {
  const [state, action, pending] = useActionState(mode === "login" ? loginAction : registerAction, undefined);
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="container-x grid items-stretch gap-0 py-10 md:grid-cols-2 md:py-16">
      <div className="relative hidden overflow-hidden rounded-l-3xl md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/eg/cat-all.jpg" alt={t.alt.collection} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-8 pt-24 text-white">
          <div className="serif text-2xl font-bold">{t.auth.welcome}</div>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/85">{mode === "login" ? t.auth.welcomeLead : t.auth.joinLead}</p>
        </div>
      </div>
      <form action={action} className="mx-auto w-full max-w-md space-y-4 rounded-3xl border border-line bg-white p-8 md:max-w-none md:rounded-l-none md:border-l-0 md:p-12">
        <h1 className="text-2xl font-bold">{mode === "login" ? t.auth.login : t.auth.register}</h1>
        {next && <input type="hidden" name="next" value={next} />}
        {mode === "register" && (
          <label className="block"><span className="label">{t.auth.name}</span><input name="name" required autoComplete="name" className="input" /></label>
        )}
        <label className="block"><span className="label">{t.auth.email}</span><input name="email" type="email" required autoComplete="email" className="input" /></label>
        <label className="block"><span className="label">{t.auth.password}</span>
          <input name="password" type="password" required minLength={mode === "register" ? 8 : undefined} autoComplete={mode === "login" ? "current-password" : "new-password"} className="input" />
        </label>
        {mode === "register" && (
          <>
            <label className="block"><span className="label">{t.auth.phone}</span><input name="phone" type="tel" autoComplete="tel" className="input" /></label>
            <label className="block"><span className="label">{t.auth.company}</span><input name="company" autoComplete="organization" className="input" /></label>
          </>
        )}
        {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full py-3">{mode === "login" ? t.auth.login : t.auth.register}</button>
        {oauthError && !state?.error && <p className="text-sm text-danger" role="alert">{t.auth.oauthFailed}</p>}
        {providers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-mute"><span className="h-px flex-1 bg-line" />{t.auth.or}<span className="h-px flex-1 bg-line" /></div>
            {providers.map((p) => (
              <a key={p} href={`/api/auth/${p}${qs}`} className={`flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition ${p === "line" ? "bg-[#06C755] text-white hover:brightness-95" : "border border-line bg-white hover:border-ink"}`}>
                {t.auth[p]}
              </a>
            ))}
          </div>
        )}
        <p className="text-center text-sm text-mute">
          {mode === "login" ? t.auth.noAccount : t.auth.haveAccount}{" "}
          <Link href={mode === "login" ? `/register${qs}` : `/login${qs}`} className="text-forest hover:underline">{mode === "login" ? t.auth.register : t.auth.login}</Link>
        </p>
      </form>
    </div>
  );
}
