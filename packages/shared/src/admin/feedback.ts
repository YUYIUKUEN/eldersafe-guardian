/** Elder star-rating → sentiment helpers for admin feedback views. */

export type RatingSentiment = "positive" | "negative" | "neutral" | "none";

/**
 * Classify a 1–5 elder rating as praise / criticism / neutral / missing.
 * Positive: 4–5 · Negative: 1–2 · Neutral: 3 · None: skipped / null.
 */
export function ratingSentiment(
  rating: number | null | undefined,
): RatingSentiment {
  if (rating == null || !Number.isFinite(rating)) return "none";
  const value = Math.round(rating);
  if (value >= 4) return "positive";
  if (value <= 2) return "negative";
  if (value === 3) return "neutral";
  return "none";
}

/** True when the rating is critical and may need admin follow-up. */
export function isNegativeFeedback(
  rating: number | null | undefined,
): boolean {
  return ratingSentiment(rating) === "negative";
}
