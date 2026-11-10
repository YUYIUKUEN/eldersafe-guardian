import { POINTS_RULES } from "./rules";

export type PointsBreakdown = {
  base: number;
  longServiceBonus: number;
  highRatingBonus: number;
  serviceMinutes: number;
  rating: number | null;
};

export type CalculatePointsInput = {
  acceptedAt: string;
  completedAt: string;
  rating?: number | null;
};

export type CalculatePointsResult = {
  total: number;
  breakdown: PointsBreakdown;
};

function serviceMinutesBetween(acceptedAt: string, completedAt: string): number {
  const start = Date.parse(acceptedAt);
  const end = Date.parse(completedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 0;
  }
  return Math.floor((end - start) / 60_000);
}

export function normalizeElderRating(
  rating: unknown,
): number | null {
  if (rating == null || rating === "") return null;
  const value = typeof rating === "number" ? rating : Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("INVALID_RATING");
  }
  return value;
}

/** Pure scoring from {@link POINTS_RULES}. */
export function calculatePointsAward(
  input: CalculatePointsInput,
): CalculatePointsResult {
  const rating =
    input.rating == null ? null : normalizeElderRating(input.rating);
  const minutes = serviceMinutesBetween(input.acceptedAt, input.completedAt);

  const base = POINTS_RULES.basePoints;
  const longServiceBonus =
    minutes > POINTS_RULES.longServiceBonusMinutes
      ? POINTS_RULES.longServiceBonusPoints
      : 0;
  const highRatingBonus =
    rating != null && rating >= POINTS_RULES.highRatingMinStars
      ? POINTS_RULES.highRatingBonusPoints
      : 0;

  return {
    total: base + longServiceBonus + highRatingBonus,
    breakdown: {
      base,
      longServiceBonus,
      highRatingBonus,
      serviceMinutes: minutes,
      rating,
    },
  };
}
