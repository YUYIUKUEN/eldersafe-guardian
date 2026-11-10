"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  AdminActivityAction,
  adminDestinationForAccess,
  loadAccessContext,
  validateLoginInput,
} from "@eldersafe/shared";
import { useRouter } from "@/i18n/navigation";
import { logAdminActivity } from "@/lib/auth/activity";
import { createClient } from "@/lib/supabase/browser";
import { FieldError } from "./FieldError";

type LoginFormProps = {
  nextPath?: string | null;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const t = useTranslations("AdminAuth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none ring-brand focus:ring-2";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setEmailError(null);
    setPasswordError(null);

    const validated = validateLoginInput({ email, password });
    if (!validated.value) {
      for (const issue of validated.issues) {
        const message = t(`errors.${issue.field}.${issue.code}`);
        if (issue.field === "email") setEmailError(message);
        if (issue.field === "password") setPasswordError(message);
      }
      setFormError(t("formError"));
      return;
    }

    const credentials = validated.value;

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) {
          setFormError(t("authFailed"));
          return;
        }

        const access = await loadAccessContext(supabase, data.user.id);
        const destination = adminDestinationForAccess(access);

        if (destination === "/unauthorized") {
          setFormError(t("noPermission"));
          router.replace("/unauthorized");
          router.refresh();
          return;
        }

        if (destination !== "/") {
          setFormError(t("authFailed"));
          await supabase.auth.signOut();
          return;
        }

        await logAdminActivity({
          action: AdminActivityAction.login,
          userId: data.user.id,
        });

        const safeNext =
          nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
            ? nextPath
            : "/";
        router.replace(safeNext);
        router.refresh();
      } catch {
        setFormError(t("authFailed"));
      }
    });
  }

  return (
    <section className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 py-8 sm:py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          {t("loginTitle")}
        </h1>
        <p className="text-base text-slate-700 sm:text-lg">{t("loginSubtitle")}</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {t("email")}
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={pending}
            />
          </label>
          <FieldError message={emailError ?? undefined} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {t("password")}
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={pending}
            />
          </label>
          <FieldError message={passwordError ?? undefined} />
        </div>

        {formError ? (
          <p
            className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? t("submittingLogin") : t("submitLogin")}
        </button>
      </form>

      <p className="text-sm text-slate-600">{t("noRegisterHint")}</p>
    </section>
  );
}
