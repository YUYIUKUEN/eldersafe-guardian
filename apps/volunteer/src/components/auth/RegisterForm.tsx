"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  validateVolunteerRegisterInput,
  type VolunteerField,
  type VolunteerValidationIssue,
} from "@eldersafe/shared";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";
import { AuthShell } from "./AuthShell";
import { FieldError } from "./FieldError";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

type FieldErrors = Partial<Record<VolunteerField, string>>;

function issueMessage(
  t: ReturnType<typeof useTranslations<"VolunteerAuth">>,
  issue: VolunteerValidationIssue,
): string {
  return t(`errors.${issue.field}.${issue.code}`);
}

export function RegisterForm() {
  const t = useTranslations("VolunteerAuth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [serviceAreas, setServiceAreas] = useState("");
  const [bio, setBio] = useState("");
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none ring-brand focus:ring-2";

  const disabled = pending;

  function applyIssues(issues: VolunteerValidationIssue[]) {
    const next: FieldErrors = {};
    for (const issue of issues) {
      if (!next[issue.field]) {
        next[issue.field] = issueMessage(t, issue);
      }
    }
    setFieldErrors(next);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validated = validateVolunteerRegisterInput({
      name,
      phone,
      email,
      password,
      age,
      serviceAreas,
      bio,
      consent,
    });

    if (!validated.value) {
      applyIssues(validated.issues);
      setFormError(t("formError"));
      return;
    }

    const payloadInput = validated.value;

    setFieldErrors({});
    startTransition(async () => {
      try {
        const response = await fetch("/api/volunteers/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadInput),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          issues?: VolunteerValidationIssue[];
        };

        if (!response.ok) {
          if (payload.error === "validation_failed" && payload.issues) {
            applyIssues(payload.issues);
            setFormError(t("formError"));
            return;
          }
          if (payload.error === "email_taken") {
            setFieldErrors({ email: t("emailTaken") });
            setFormError(t("emailTaken"));
            return;
          }
          setFormError(t("registerFailed"));
          return;
        }

        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: payloadInput.email,
          password: payloadInput.password,
        });

        if (signInError) {
          router.replace("/login");
          return;
        }

        router.replace("/pending");
        router.refresh();
      } catch {
        setFormError(t("registerFailed"));
      }
    });
  }

  const consentId = useMemo(() => "volunteer-consent", []);

  return (
    <AuthShell title={t("registerTitle")} subtitle={t("registerSubtitle")}>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {t("name")}
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={disabled}
            />
          </label>
          <FieldError message={fieldErrors.name} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {t("phone")}
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              disabled={disabled}
            />
          </label>
          <FieldError message={fieldErrors.phone} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {t("email")}
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={disabled}
            />
          </label>
          <FieldError message={fieldErrors.email} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {t("password")}
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={disabled}
            />
          </label>
          <PasswordStrengthMeter password={password} />
          <FieldError message={fieldErrors.password} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {t("age")}
            <input
              className={inputClass}
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={disabled}
            />
          </label>
          <FieldError message={fieldErrors.age} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {t("serviceAreas")}
            <textarea
              className={`${inputClass} min-h-24`}
              value={serviceAreas}
              onChange={(e) => setServiceAreas(e.target.value)}
              disabled={disabled}
            />
          </label>
          <p className="mt-1 text-sm text-slate-600">{t("serviceAreasHint")}</p>
          <FieldError message={fieldErrors.serviceAreas} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {t("bio")}
            <textarea
              className={`${inputClass} min-h-28`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={disabled}
            />
          </label>
          <p className="mt-1 text-sm text-slate-600">{t("bioHint")}</p>
          <FieldError message={fieldErrors.bio} />
        </div>

        <div>
          <label
            htmlFor={consentId}
            className="flex items-start gap-3 text-sm font-medium text-slate-800"
          >
            <input
              id={consentId}
              type="checkbox"
              className="mt-1 size-5 rounded border-slate-400"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={disabled}
            />
            <span>{t("consentLabel")}</span>
          </label>
          <FieldError message={fieldErrors.consent} />
        </div>

        {formError ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={disabled}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? t("submittingRegister") : t("submitRegister")}
        </button>
      </form>

      <p className="text-sm text-slate-700">
        <Link href="/login" className="font-semibold text-brand underline">
          {t("loginLink")}
        </Link>
      </p>
    </AuthShell>
  );
}
