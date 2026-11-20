"use client";
import Link from "next/link";
import { useActionState } from "react";
import { t } from "@/i18n";
import { loginAction, registerAction } from "@/app/actions";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? loginAction : registerAction, undefined);
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="container-x flex justify-center py-16">
      <form action={action} className="card w-full max-w-sm space-y-4 p-7">
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
        <p className="text-center text-sm text-mute">
          {mode === "login" ? t.auth.noAccount : t.auth.haveAccount}{" "}
          <Link href={mode === "login" ? `/register${qs}` : `/login${qs}`} className="text-forest hover:underline">{mode === "login" ? t.auth.register : t.auth.login}</Link>
        </p>
      </form>
    </div>
  );
}
