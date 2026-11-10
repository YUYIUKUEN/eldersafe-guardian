/** Asia/Hong_Kong calendar helpers and leaderboard display-name formatting. */

const HK_TZ = "Asia/Hong_Kong";

export type LeaderboardPeriod = "month" | "all";

export type LeaderboardEntry = {
  volunteerId: string;
  fullName: string;
  isAnonymous: boolean;
  displayName: string;
  points: number;
  completedCount: number;
  rank: number;
  isSelf: boolean;
};

function hkDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/** Current calendar year-month in Hong Kong, e.g. "2026-11". */
export function hongKongYearMonth(date: Date = new Date()): string {
  const { year, month } = hkDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Instant of the last millisecond of the current Hong Kong calendar month.
 * Used for the month-end countdown on the volunteer leaderboard.
 */
export function hongKongMonthEnd(date: Date = new Date()): Date {
  const { year, month } = hkDateParts(date);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // Hong Kong is UTC+8 with no DST → 23:59:59.999 HKT = 15:59:59.999 UTC.
  return new Date(Date.UTC(year, month - 1, lastDay, 15, 59, 59, 999));
}

export type MonthCountdown = {
  yearMonth: string;
  endsAt: string;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

export function getMonthCountdown(
  now: Date = new Date(),
  endsAt: Date = hongKongMonthEnd(now),
): MonthCountdown {
  const totalMs = Math.max(0, endsAt.getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return {
    yearMonth: hongKongYearMonth(now),
    endsAt: endsAt.toISOString(),
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    expired: totalMs <= 0,
  };
}

/**
 * Surname-only label for anonymous leaderboard rows.
 * CJK / fullwidth names → first character; Latin names → last whitespace token.
 */
export function leaderboardSurname(fullName: string): string {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  if (!trimmed) return "—";

  const hasCjk = /[\u3400-\u9FFF\uF900-\uFAFF]/.test(trimmed);
  if (hasCjk) {
    const first = Array.from(trimmed)[0];
    return first ?? "—";
  }

  const parts = trimmed.split(" ");
  return parts[parts.length - 1] || trimmed;
}

export function formatLeaderboardDisplayName(
  fullName: string,
  isAnonymous: boolean,
): string {
  return isAnonymous ? leaderboardSurname(fullName) : fullName.trim() || "—";
}

export function mapLeaderboardRows(
  rows: Array<{
    volunteer_id: string;
    full_name: string;
    is_anonymous: boolean;
    points: number;
    completed_count: number;
    rank: number | string;
  }>,
  selfId: string | null,
): LeaderboardEntry[] {
  return rows.map((row) => {
    const fullName = row.full_name ?? "";
    const isAnonymous = Boolean(row.is_anonymous);
    return {
      volunteerId: row.volunteer_id,
      fullName,
      isAnonymous,
      displayName: formatLeaderboardDisplayName(fullName, isAnonymous),
      points: Number(row.points) || 0,
      completedCount: Number(row.completed_count) || 0,
      rank: Number(row.rank) || 0,
      isSelf: selfId != null && row.volunteer_id === selfId,
    };
  });
}
