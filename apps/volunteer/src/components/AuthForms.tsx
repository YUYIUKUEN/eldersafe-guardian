"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { setSessionToken } from "@/lib/session";

export function LoginForm() {
  const t = useTranslations("VolunteerAuth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(t("invalid"));
      return;
    }
    setSessionToken(data.token);
    router.replace("/requests");
  }

  return (
    <form className="mx-auto flex w-full max-w-md flex-col gap-4" onSubmit={onSubmit}>
      <h1 className="text-3xl font-bold">{t("loginTitle")}</h1>
      <label className="grid gap-2 text-sm font-medium">
        {t("email")}
        <input name="email" type="email" required className="rounded-lg border px-3 py-3" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        {t("password")}
        <input name="password" type="password" required className="rounded-lg border px-3 py-3" />
      </label>
      {error ? <p className="text-red-700">{error}</p> : null}
      <button type="submit" className="rounded-xl bg-assist px-4 py-3 font-semibold text-white">
        {t("login")}
      </button>
      <Link href="/register" className="text-assist underline">
        {t("noAccount")}
      </Link>
    </form>
  );
}

export function RegisterForm() {
  const t = useTranslations("VolunteerAuth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        password: form.get("password"),
        age: Number(form.get("age")),
        serviceAreas: form.get("serviceAreas"),
        bio: form.get("bio"),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error === "EMAIL_EXISTS" ? t("emailExists") : t("required"));
      return;
    }
    setSessionToken(data.token);
    router.replace("/requests");
  }

  return (
    <form className="mx-auto flex w-full max-w-md flex-col gap-4" onSubmit={onSubmit}>
      <h1 className="text-3xl font-bold">{t("registerTitle")}</h1>
      {(
        [
          ["name", "text"],
          ["phone", "tel"],
          ["email", "email"],
          ["password", "password"],
          ["age", "number"],
          ["serviceAreas", "text"],
        ] as const
      ).map(([name, type]) => (
        <label key={name} className="grid gap-2 text-sm font-medium">
          {t(name)}
          <input name={name} type={type} required className="rounded-lg border px-3 py-3" />
        </label>
      ))}
      <label className="grid gap-2 text-sm font-medium">
        {t("bio")}
        <textarea name="bio" required className="min-h-24 rounded-lg border px-3 py-3" />
      </label>
      {error ? <p className="text-red-700">{error}</p> : null}
      <button type="submit" className="rounded-xl bg-assist px-4 py-3 font-semibold text-white">
        {t("register")}
      </button>
      <Link href="/login" className="text-assist underline">
        {t("hasAccount")}
      </Link>
    </form>
  );
}
