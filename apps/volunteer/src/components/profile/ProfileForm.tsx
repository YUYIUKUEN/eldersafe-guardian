"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  validateResetPasswordInput,
  validateVolunteerProfileInput,
  type VolunteerValidationIssue,
} from "@eldersafe/shared";
import { FieldError } from "@/components/auth/FieldError";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";

export type ProfileFormValues = {
  email: string;
  name: string;
  phone: string;
  age: number;
  serviceAreas: string[];
  bio: string;
};

type ProfileFormProps = {
  initial: ProfileFormValues;
};

type FieldErrors = Partial<
  Record<"name" | "phone" | "age" | "serviceAreas" | "bio" | "password", string>
>;

export function ProfileForm({ initial }: ProfileFormProps) {
  const t = useTranslations("VolunteerProfile");
  const tAuth = useTranslations("VolunteerAuth");
  const [pending, startTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();

  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [age, setAge] = useState(String(initial.age));
  const [serviceAreas, setServiceAreas] = useState(
    initial.serviceAreas.join(", "),
  );
  const [bio, setBio] = useState(initial.bio);
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none ring-brand focus:ring-2";

  function applyIssues(issues: VolunteerValidationIssue[]) {
    const next: FieldErrors = {};
    for (const issue of issues) {
      if (
        issue.field === "name" ||
        issue.field === "phone" ||
        issue.field === "age" ||
        issue.field === "serviceAreas" ||
        issue.field === "bio"
      ) {
        next[issue.field] = tAuth(`errors.${issue.field}.${issue.code}`);
      }
    }
    setFieldErrors(next);
  }

  function onSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const validated = validateVolunteerProfileInput({
      name,
      phone,
      age,
      serviceAreas,
      bio,
    });
    if (!validated.value) {
      applyIssues(validated.issues);
      setFormError(t("saveFailed"));
      return;
    }

    const payload = validated.value;
    setFieldErrors({});
    startTransition(async () => {
      try {
        const response = await fetch("/api/volunteers/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          issues?: VolunteerValidationIssue[];
        };
        if (!response.ok) {
          if (body.error === "validation_failed" && body.issues) {
            applyIssues(body.issues);
          }
          setFormError(t("saveFailed"));
          return;
        }
        setFormSuccess(t("saved"));
      } catch {
        setFormError(t("saveFailed"));
      }
    });
  }

  function onChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const validated = validateResetPasswordInput({ password });
    if (!validated.value) {
      const issue = validated.issues[0];
      setPasswordError(
        issue
          ? tAuth(`errors.password.${issue.code}`)
          : t("passwordChangeFailed"),
      );
      return;
    }

    const newPassword = validated.value.password;
    startPasswordTransition(async () => {
      try {
        const response = await fetch("/api/volunteers/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
        });
        if (!response.ok) {
          setPasswordError(t("passwordChangeFailed"));
          return;
        }
        setPassword("");
        setPasswordSuccess(t("passwordChanged"));
      } catch {
        setPasswordError(t("passwordChangeFailed"));
      }
    });
  }

  return (
    <div className="space-y-10">
      <form className="space-y-4" onSubmit={onSaveProfile} noValidate>
        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {t("emailReadOnly")}
            <input
              className={`${inputClass} bg-slate-100 text-slate-600`}
              value={initial.email}
              readOnly
              disabled
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {tAuth("name")}
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              autoComplete="name"
            />
          </label>
          <FieldError message={fieldErrors.name} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {tAuth("phone")}
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={pending}
              inputMode="tel"
              autoComplete="tel"
            />
          </label>
          <FieldError message={fieldErrors.phone} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {tAuth("age")}
            <input
              className={inputClass}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={pending}
              inputMode="numeric"
            />
          </label>
          <FieldError message={fieldErrors.age} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {tAuth("serviceAreas")}
            <textarea
              className={`${inputClass} min-h-24`}
              value={serviceAreas}
              onChange={(e) => setServiceAreas(e.target.value)}
              disabled={pending}
            />
          </label>
          <p className="mt-1 text-sm text-slate-600">
            {tAuth("serviceAreasHint")}
          </p>
          <FieldError message={fieldErrors.serviceAreas} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {tAuth("bio")}
            <textarea
              className={`${inputClass} min-h-28`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={pending}
            />
          </label>
          <FieldError message={fieldErrors.bio} />
        </div>

        {formError ? (
          <p
            className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
            role="alert"
          >
            {formError}
          </p>
        ) : null}
        {formSuccess ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
            {formSuccess}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
        >
          {pending ? t("saving") : t("save")}
        </button>
      </form>

      <form className="space-y-4 border-t border-slate-200 pt-8" onSubmit={onChangePassword} noValidate>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">
            {t("passwordSection")}
          </h2>
          <p className="text-sm text-slate-600">{t("passwordHint")}</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {t("newPassword")}
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={passwordPending}
              autoComplete="new-password"
            />
          </label>
          <PasswordStrengthMeter password={password} />
          <FieldError message={passwordError ?? undefined} />
        </div>

        {passwordSuccess ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
            {passwordSuccess}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={passwordPending}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-800 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 sm:w-auto"
        >
          {passwordPending ? t("changingPassword") : t("changePassword")}
        </button>
      </form>
    </div>
  );
}
