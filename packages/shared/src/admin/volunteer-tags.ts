/**
 * Background tags so admins can spot volunteer engagement at a glance.
 *
 * - first_time: 0 or 1 completed services ever
 * - inactive: last served more than 30 days ago (and has served at least once)
 * - frequent: ≥ 3 completions in the last 30 days
 */

export type VolunteerTag = "first_time" | "inactive" | "frequent";

export const VOLUNTEER_INACTIVE_DAYS = 30;
export const VOLUNTEER_FREQUENT_MIN_COMPLETED_30D = 3;

export type VolunteerTagInput = {
  /** Lifetime completed help requests (status=completed). */
  totalCompleted: number;
  /** Completions with completed_at within the last 30 days. */
  completedLast30Days: number;
  /**
   * Most recent accepted_at or completed_at for this volunteer.
   * Null when they have never accepted a request.
   */
  lastServedAt: string | null;
  /** Optional reference time (defaults to now). Useful for tests. */
  nowMs?: number;
};

function daysBetween(fromIso: string, nowMs: number): number {
  const then = new Date(fromIso).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return (nowMs - then) / (24 * 60 * 60 * 1000);
}

/**
 * Returns zero or more tags. `frequent` suppresses `inactive` so the
 * admin does not see contradictory labels.
 */
export function computeVolunteerTags(
  input: VolunteerTagInput,
): VolunteerTag[] {
  const nowMs = input.nowMs ?? Date.now();
  const tags: VolunteerTag[] = [];

  if (input.totalCompleted <= 1) {
    tags.push("first_time");
  }

  const frequent =
    input.completedLast30Days >= VOLUNTEER_FREQUENT_MIN_COMPLETED_30D;
  if (frequent) {
    tags.push("frequent");
  } else if (
    input.totalCompleted >= 1 &&
    input.lastServedAt &&
    daysBetween(input.lastServedAt, nowMs) > VOLUNTEER_INACTIVE_DAYS
  ) {
    tags.push("inactive");
  }

  return tags;
}
