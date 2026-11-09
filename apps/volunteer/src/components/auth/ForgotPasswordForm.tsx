"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { validateForgotPasswordInput } from "@eldersafe/shared";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";
import { AuthShell } from "./AuthShell";
import { FieldError } from "./FieldError";

export function ForgotPasswordForm() {
  const t = useTranslations("VolunteerAuth");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none ring-brand focus:ring-2";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setEmailError(null);

    const validated = validateForgotPasswordInput({ email });
    if (!validated.value) {
      const issue = validated.issues[0];
      if (issue) {
        setEmailError(t(`errors.email.${issue.code}`));
      }
      setFormError(t("formError"));
      return;
    }

    const emailValue = validated.value.email;

    startTransition(async () => {
      try {
        const supabase = createClient();
        const redirectTo = `${window.location.origin}/${locale}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(
          emailValue,
          { redirectTo },
        );
        if (error) {
          setFormError(t("forgotFailed"));
          return;
        }
        setSent(true);
      } catch {
        setFormError(t("forgotFailed"));
      }
    });
  }

  return (
    <AuthShell title={t("forgotTitle")} subtitle={t("forgotSubtitle")}>
      {sent ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-900">
          {t("forgotSent")}
        </p>
      ) : (
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
            {pending ? t("submittingForgot") : t("submitForgot")}
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
