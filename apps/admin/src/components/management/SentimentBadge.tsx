"use client";

import { useTranslations } from "next-intl";
import type { RatingSentiment } from "@eldersafe/shared";
import { StatusBadge } from "./StatusBadge";

const SENTIMENT_TONE: Record<
  RatingSentiment,
  "neutral" | "success" | "warning" | "danger"
> = {
  positive: "success",
  negative: "danger",
  neutral: "warning",
  none: "neutral",
};

type SentimentBadgeProps = {
  sentiment: RatingSentiment;
  rating?: number | null;
};

export function SentimentBadge({ sentiment, rating }: SentimentBadgeProps) {
  const t = useTranslations("AdminFeedback");
  const label =
    rating != null
      ? t("sentimentWithStars", {
          sentiment: t(`sentiment.${sentiment}`),
          stars: rating,
        })
      : t(`sentiment.${sentiment}`);

  return <StatusBadge label={label} tone={SENTIMENT_TONE[sentiment]} />;
}
