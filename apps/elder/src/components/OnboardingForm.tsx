"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getOrCreateDeviceKey,
  saveElderProfile,
  type StoredElderProfile,
} from "@eldersafe/shared";

type OnboardingFormProps = {
  onComplete: (profile: StoredElderProfile) => void;
};

export function OnboardingForm({ onComplete }: OnboardingFormProps) {
  const t = useTranslations("ElderOnboarding");
  const [errorField, setErrorField] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const ageRaw = String(form.get("age") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const emergencyContact = String(form.get("emergencyContact") ?? "").trim();
    const healthNotes = String(form.get("healthNotes") ?? "").trim();
    const age = Number(ageRaw);

    const required: Array<[string, string]> = [
      ["name", name],
      ["age", ageRaw],
      ["phone", phone],
      ["address", address],
      ["emergencyContact", emergencyContact],
    ];
    const missing = required.find(([, value]) => !value);
    if (missing || !Number.isFinite(age) || age <= 0) {
      setErrorField(missing?.[0] ?? "age");
      return;
    }

    const profile = saveElderProfile({
      deviceKey: getOrCreateDeviceKey(),
      name,
      age,
      phone,
      address,
      emergencyContact,
      healthNotes: healthNotes || undefined,
    });
    onComplete(profile);
  }

  const fieldClass =
    "min-h-14 w-full rounded-xl border-2 border-slate-400 bg-white px-4 text-[20px] text-foreground";
  const labelClass = "mb-2 block text-[20px] font-semibold text-foreground";

  return (
    <section className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 py-4">
      <div className="space-y-2">
        <h1 className="text-[28px] font-bold leading-tight">{t("title")}</h1>
        <p className="text-[20px] leading-relaxed text-slate-700">
          {t("subtitle")}
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        {(
          [
            ["name", "text"],
            ["age", "number"],
            ["phone", "tel"],
            ["address", "text"],
            ["emergencyContact", "text"],
          ] as const
        ).map(([key, type]) => (
          <div key={key}>
            <label className={labelClass} htmlFor={key}>
              {t(key)}
            </label>
            <input
              id={key}
              name={key}
              type={type}
              className={fieldClass}
              inputMode={type === "number" ? "numeric" : undefined}
              autoComplete="on"
            />
            {errorField === key ? (
              <p className="mt-2 text-[20px] text-red-700">{t("required")}</p>
            ) : null}
          </div>
        ))}

        <div>
          <label className={labelClass} htmlFor="healthNotes">
            {t("healthNotes")}
          </label>
          <textarea
            id="healthNotes"
            name="healthNotes"
            className={`${fieldClass} min-h-28 py-3`}
          />
        </div>

        <button
          type="submit"
          className="min-h-16 rounded-2xl bg-brand px-4 text-[22px] font-bold text-white"
        >
          {t("submit")}
        </button>
      </form>
    </section>
  );
}
