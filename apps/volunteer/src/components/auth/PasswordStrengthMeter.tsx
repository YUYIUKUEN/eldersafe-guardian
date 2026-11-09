"use client";

import { useTranslations } from "next-intl";
import {
  scorePasswordStrength,
  type PasswordStrength,
} from "@eldersafe/shared";

const LEVEL_WIDTH: Record<PasswordStrength, string> = {
  too_short: "w-1/5",
  weak: "w-2/5",
  fair: "w-3/5",
  good: "w-4/5",
  strong: "w-full",
};

const LEVEL_COLOR: Record<PasswordStrength, string> = {
  too_short: "bg-slate-400",
  weak: "bg-red-500",
  fair: "bg-amber-500",
  good: "bg-lime-600",
  strong: "bg-emerald-600",
};

type PasswordStrengthMeterProps = {
  password: string;
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const t = useTranslations("VolunteerAuth");
  if (!password) return null;

  const strength = scorePasswordStrength(password);
  const level = t(`strength.${strength}`);

  return (
    <div className="mt-2 space-y-1" aria-live="polite">
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${LEVEL_WIDTH[strength]} ${LEVEL_COLOR[strength]}`}
        />
      </div>
      <p className="text-sm text-slate-700">
        {t("passwordStrength", { level })}
      </p>
    </div>
  );
}
