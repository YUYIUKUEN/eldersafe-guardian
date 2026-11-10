/**
 * Points rules for elder-confirmed help requests.
 * Edit this file to tune scoring without touching award / SQL call sites.
 */
export const POINTS_RULES = {
  /** Points awarded for every elder-confirmed help request. */
  basePoints: 10,
  /**
   * Extra points when volunteer service duration
   * (accepted_at → completed_at) exceeds this many minutes.
   */
  longServiceBonusMinutes: 30,
  longServiceBonusPoints: 5,
  /** Elder ratings at or above this value grant a bonus (1–5 scale). */
  highRatingMinStars: 4,
  highRatingBonusPoints: 5,
} as const;

export type PointsRules = typeof POINTS_RULES;
