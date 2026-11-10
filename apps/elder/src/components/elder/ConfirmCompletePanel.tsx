"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";

type ConfirmCompletePanelProps = {
  busy: boolean;
  onConfirm: (rating: number | null) => void | Promise<void>;
};

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

/**
 * Elder confirm-complete UI: optional 1–5 star rating (skippable)
 * plus one primary confirm action.
 */
export function ConfirmCompletePanel({
  busy,
  onConfirm,
}: ConfirmCompletePanelProps) {
  const t = useTranslations("HelpRecords");
  const [rating, setRating] = useState<number | null>(null);

  return (
    <section className="flex flex-col gap-4" aria-label={t("ratingLabel")}>
      <BigText className="text-center" tone="muted">
        {t("ratingHint")}
      </BigText>

      <div
        className="grid grid-cols-5 gap-2"
        role="group"
        aria-label={t("ratingLabel")}
      >
        {STAR_VALUES.map((value) => {
          const selected = rating === value;
          return (
            <button
              key={value}
              type="button"
              disabled={busy}
              aria-pressed={selected}
              aria-label={t("starLabel", { count: value })}
              onClick={() => setRating(value)}
              className={[
                "flex min-h-[72px] flex-col items-center justify-center rounded-2xl border-4 px-1 py-2",
                "text-[36px] font-bold leading-none transition-[filter]",
                "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                busy ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                selected
                  ? "border-assist bg-assist text-assist-fg"
                  : "border-brand bg-white text-[#9a3412]",
              ].join(" ")}
            >
              <span aria-hidden="true">★</span>
              <span className="mt-1 text-[20px] font-bold leading-none">
                {value}
              </span>
            </button>
          );
        })}
      </div>

      {rating != null ? (
        <BigButton
          type="button"
          variant="neutral"
          className="min-h-[72px]"
          disabled={busy}
          onClick={() => setRating(null)}
        >
          {t("skipRating")}
        </BigButton>
      ) : (
        <BigText className="text-center text-[20px]" tone="muted">
          {t("ratingOptional")}
        </BigText>
      )}

      <BigButton
        variant="assist"
        className="min-h-[110px] text-[26px] leading-snug"
        disabled={busy}
        onClick={() => void onConfirm(rating)}
      >
        {busy ? t("confirming") : t("confirmThanks")}
      </BigButton>
    </section>
  );
}
