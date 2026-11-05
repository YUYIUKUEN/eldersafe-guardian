"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { setSessionToken } from "@/lib/session";

export function LoginForm() {
  const t = useTranslations("Admin");
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
    router.replace("/users");
  }

  return (
    <form className="mx-auto flex w-full max-w-md flex-col gap-4" onSubmit={onSubmit}>
      <h1 className="text-3xl font-bold">{t("loginTitle")}</h1>
      <p className="text-sm text-slate-600">{t("defaultHint")}</p>
      <label className="grid gap-2 text-sm font-medium">
        {t("email")}
        <input name="email" type="email" required className="rounded-lg border px-3 py-3" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        {t("password")}
        <input name="password" type="password" required className="rounded-lg border px-3 py-3" />
      </label>
      {error ? <p className="text-red-700">{error}</p> : null}
      <button type="submit" className="rounded-xl bg-brand px-4 py-3 font-semibold text-white">
        {t("login")}
      </button>
    </form>
  );
}
