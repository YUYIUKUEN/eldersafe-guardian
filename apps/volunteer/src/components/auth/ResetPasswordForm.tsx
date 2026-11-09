"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  validateResetPasswordInput,
  VolunteerActivityAction,
} from "@eldersafe/shared";
import { Link, useRouter } from "@/i18n/navigation";
import { logVolunteerActivity } from "@/lib/auth/activity";
import { createClient } from "@/lib/supabase/browser";
import { AuthShell } from "./AuthShell";
import { FieldError } from "./FieldError";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

export function ResetPasswordForm() {
  const t = useTranslations("VolunteerAuth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none ring-brand focus:ring-2";

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setReady(Boolean(session));
        setChecking(false);
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(Boolean(session));
        setChecking(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPasswordError(null);

    const validated = validateResetPasswordInput({ password });
    if (!validated.value) {
      const issue = validated.issues[0];
      if (issue) {
        setPasswordError(t(`errors.password.${issue.code}`));
      }
      setFormError(t("formError"));
      return;
    }

    const newPassword = validated.value.password;

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error || !data.user) {
          setFormError(t("resetFailed"));
          return;
        }

        await logVolunteerActivity({
          action: VolunteerActivityAction.passwordResetComplete,
          userId: data.user.id,
        });

        await supabase.auth.signOut();
        router.replace("/login");
        router.refresh();
      } catch {
        setFormError(t("resetFailed"));
      }
    });
  }

  return (
    <AuthShell title={t("resetTitle")} subtitle={t("resetSubtitle")}>
      {checking ? (
        <p className="text-base text-slate-700">…</p>
      ) : !ready ? (
        <div className="space-y-4">
          <p
            className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
            role="alert"
          >
            {t("resetSessionMissing")}
          </p>
          <Link
            href="/forgot-password"
            className="font-semibold text-brand underline"
          >
            {t("forgotLink")}
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label className="block text-sm font-semibold text-slate-800">
              {t("password")}
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={pending}
              />
            </label>
            <PasswordStrengthMeter password={password} />
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
            {pending ? t("submittingReset") : t("submitReset")}
          </button>
        </form>
      )}

      <p className="text-sm text-slate-700">
        <Link href="/login" className="font-semibold text-brand underline">
          {t("backToLogin")}
        </Link>
      </p>
    </AuthShell>
  );
}
