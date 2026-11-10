import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityLevel = "high" | "medium" | "low";

export type DayCount = { date: string; count: number };

export type VolunteerEngagement = {
  id: string;
  name: string;
  acceptedCount: number;
  completedCount: number;
  completionRate: number;
  avgResponseMinutes: number | null;
  lastActiveAt: string | null;
  level: ActivityLevel;
  trend: DayCount[];
};

export type ElderEngagement = {
  id: string;
  name: string;
  helpCount: number;
  lastActiveAt: string | null;
  level: ActivityLevel;
  trend: DayCount[];
};

/** Documented rules (also shown on the activity page via i18n). */
export function volunteerActivityLevel(input: {
  acceptedCount: number;
  completedCount: number;
  completionRate: number;
}): ActivityLevel {
  const { acceptedCount, completedCount, completionRate } = input;
  if (
    completedCount >= 4 ||
    (acceptedCount >= 6 && completionRate >= 75)
  ) {
    return "high";
  }
  if (acceptedCount >= 2 || completedCount >= 1) return "medium";
  return "low";
}

export function elderActivityLevel(helpCount: number): ActivityLevel {
  if (helpCount >= 3) return "high";
  if (helpCount >= 1) return "medium";
  return "low";
}

function hkDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return { year: get("year"), month: get("month"), day: get("day") };
}

function hkMidnightIso(year: string, month: string, day: string) {
  return new Date(`${year}-${month}-${day}T00:00:00+08:00`).toISOString();
}

function shiftHkDay(
  parts: { year: string; month: string; day: string },
  delta: number,
) {
  const base = new Date(
    `${parts.year}-${parts.month}-${parts.day}T12:00:00+08:00`,
  );
  base.setTime(base.getTime() + delta * 24 * 60 * 60 * 1000);
  return hkDateParts(base);
}

function monthBounds() {
  const today = hkDateParts(new Date());
  const monthStart = hkMidnightIso(today.year, today.month, "01");
  const nextMonth =
    today.month === "12"
      ? { year: String(Number(today.year) + 1), month: "01", day: "01" }
      : {
          year: today.year,
          month: String(Number(today.month) + 1).padStart(2, "0"),
          day: "01",
        };
  const monthEnd = hkMidnightIso(
    nextMonth.year,
    nextMonth.month,
    nextMonth.day,
  );
  return { monthStart, monthEnd, today };
}

function last30DayKeys(today: { year: string; month: string; day: string }) {
  const start = shiftHkDay(today, -29);
  const keys: string[] = [];
  for (let i = 0; i < 30; i += 1) {
    const day = shiftHkDay(start, i);
    keys.push(`${day.year}-${day.month}-${day.day}`);
  }
  return {
    keys,
    startIso: hkMidnightIso(start.year, start.month, start.day),
  };
}

function emptyTrend(keys: string[]): DayCount[] {
  return keys.map((date) => ({ date, count: 0 }));
}

function fillTrend(
  keys: string[],
  timestamps: string[],
): DayCount[] {
  const map = new Map(keys.map((key) => [key, 0]));
  for (const iso of timestamps) {
    const parts = hkDateParts(new Date(iso));
    const key = `${parts.year}-${parts.month}-${parts.day}`;
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return keys.map((date) => ({ date, count: map.get(date) ?? 0 }));
}

function maxIso(values: Array<string | null | undefined>) {
  let best: string | null = null;
  for (const value of values) {
    if (!value) continue;
    if (!best || value > best) best = value;
  }
  return best;
}

export async function loadVolunteerEngagement(
  supabase: SupabaseClient,
): Promise<VolunteerEngagement[]> {
  const { monthStart, monthEnd, today } = monthBounds();
  const { keys, startIso } = last30DayKeys(today);

  const { data: volunteers, error: volunteersError } = await supabase
    .from("volunteers")
    .select("id, name, updated_at")
    .order("name", { ascending: true });
  if (volunteersError) throw new Error(volunteersError.message);

  const ids = (volunteers ?? []).map((row) => row.id as string);
  if (ids.length === 0) return [];

  const { data: helps, error: helpsError } = await supabase
    .from("help_requests")
    .select(
      "id, volunteer_id, status, created_at, accepted_at, completed_at, cancelled_at",
    )
    .in("volunteer_id", ids)
    .gte("created_at", startIso);
  if (helpsError) throw new Error(helpsError.message);

  const byVolunteer = new Map<
    string,
    {
      acceptedMonth: number;
      completedMonth: number;
      responseMs: number[];
      lastActive: string | null;
      trendTs: string[];
    }
  >();

  for (const id of ids) {
    byVolunteer.set(id, {
      acceptedMonth: 0,
      completedMonth: 0,
      responseMs: [],
      lastActive: null,
      trendTs: [],
    });
  }

  for (const row of helps ?? []) {
    const volunteerId = row.volunteer_id as string | null;
    if (!volunteerId) continue;
    const bucket = byVolunteer.get(volunteerId);
    if (!bucket) continue;

    const acceptedAt = row.accepted_at as string | null;
    const completedAt = row.completed_at as string | null;
    const createdAt = row.created_at as string;

    bucket.lastActive = maxIso([
      bucket.lastActive,
      acceptedAt,
      completedAt,
      createdAt,
    ]);

    if (acceptedAt && acceptedAt >= startIso) {
      bucket.trendTs.push(acceptedAt);
    }

    if (acceptedAt && acceptedAt >= monthStart && acceptedAt < monthEnd) {
      bucket.acceptedMonth += 1;
      const created = new Date(createdAt).getTime();
      const accepted = new Date(acceptedAt).getTime();
      if (!Number.isNaN(created) && !Number.isNaN(accepted) && accepted >= created) {
        bucket.responseMs.push(accepted - created);
      }
    }

    if (
      row.status === "completed" &&
      completedAt &&
      completedAt >= monthStart &&
      completedAt < monthEnd
    ) {
      bucket.completedMonth += 1;
    }
  }

  return (volunteers ?? []).map((row) => {
    const id = row.id as string;
    const stats = byVolunteer.get(id)!;
    const acceptedCount = stats.acceptedMonth;
    const completedCount = stats.completedMonth;
    const completionRate =
      acceptedCount === 0
        ? 0
        : Math.round((completedCount / acceptedCount) * 1000) / 10;
    const avgResponseMinutes =
      stats.responseMs.length === 0
        ? null
        : Math.round(
            stats.responseMs.reduce((sum, ms) => sum + ms, 0) /
              stats.responseMs.length /
              60000,
          );
    const lastActiveAt = maxIso([
      stats.lastActive,
      row.updated_at as string,
    ]);

    return {
      id,
      name: row.name as string,
      acceptedCount,
      completedCount,
      completionRate,
      avgResponseMinutes,
      lastActiveAt,
      level: volunteerActivityLevel({
        acceptedCount,
        completedCount,
        completionRate,
      }),
      trend:
        stats.trendTs.length > 0
          ? fillTrend(keys, stats.trendTs)
          : emptyTrend(keys),
    };
  });
}

export async function loadElderEngagement(
  supabase: SupabaseClient,
): Promise<ElderEngagement[]> {
  const { monthStart, monthEnd, today } = monthBounds();
  const { keys, startIso } = last30DayKeys(today);

  const { data: elders, error: eldersError } = await supabase
    .from("elders")
    .select("id, name, updated_at")
    .order("name", { ascending: true });
  if (eldersError) throw new Error(eldersError.message);

  const ids = (elders ?? []).map((row) => row.id as string);
  if (ids.length === 0) return [];

  const [helpsRes, emergenciesRes] = await Promise.all([
    supabase
      .from("help_requests")
      .select("elder_id, created_at")
      .in("elder_id", ids)
      .gte("created_at", startIso),
    supabase
      .from("emergencies")
      .select("elder_id, started_at")
      .in("elder_id", ids)
      .gte("started_at", startIso),
  ]);

  if (helpsRes.error) throw new Error(helpsRes.error.message);
  if (emergenciesRes.error) throw new Error(emergenciesRes.error.message);

  const byElder = new Map<
    string,
    { helpMonth: number; lastActive: string | null; trendTs: string[] }
  >();
  for (const id of ids) {
    byElder.set(id, { helpMonth: 0, lastActive: null, trendTs: [] });
  }

  for (const row of helpsRes.data ?? []) {
    const bucket = byElder.get(row.elder_id as string);
    if (!bucket) continue;
    const createdAt = row.created_at as string;
    bucket.lastActive = maxIso([bucket.lastActive, createdAt]);
    bucket.trendTs.push(createdAt);
    if (createdAt >= monthStart && createdAt < monthEnd) {
      bucket.helpMonth += 1;
    }
  }

  for (const row of emergenciesRes.data ?? []) {
    const bucket = byElder.get(row.elder_id as string);
    if (!bucket) continue;
    bucket.lastActive = maxIso([bucket.lastActive, row.started_at as string]);
  }

  return (elders ?? []).map((row) => {
    const id = row.id as string;
    const stats = byElder.get(id)!;
    const helpCount = stats.helpMonth;
    return {
      id,
      name: row.name as string,
      helpCount,
      lastActiveAt: maxIso([stats.lastActive, row.updated_at as string]),
      level: elderActivityLevel(helpCount),
      trend:
        stats.trendTs.length > 0
          ? fillTrend(keys, stats.trendTs)
          : emptyTrend(keys),
    };
  });
}

export function sortVolunteerEngagement(
  items: VolunteerEngagement[],
  sortBy: string,
  sortDir: "asc" | "desc",
) {
  const dir = sortDir === "asc" ? 1 : -1;
  const levelRank = { high: 3, medium: 2, low: 1 };
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name, "zh-HK") * dir;
      case "acceptedCount":
        return (a.acceptedCount - b.acceptedCount) * dir;
      case "completedCount":
        return (a.completedCount - b.completedCount) * dir;
      case "completionRate":
        return (a.completionRate - b.completionRate) * dir;
      case "avgResponseMinutes":
        return (
          ((a.avgResponseMinutes ?? Number.POSITIVE_INFINITY) -
            (b.avgResponseMinutes ?? Number.POSITIVE_INFINITY)) *
          dir
        );
      case "lastActiveAt":
        return (a.lastActiveAt ?? "").localeCompare(b.lastActiveAt ?? "") * dir;
      case "level":
        return (levelRank[a.level] - levelRank[b.level]) * dir;
      default:
        return (levelRank[b.level] - levelRank[a.level]) ||
          b.completedCount - a.completedCount;
    }
  });
}

export function sortElderEngagement(
  items: ElderEngagement[],
  sortBy: string,
  sortDir: "asc" | "desc",
) {
  const dir = sortDir === "asc" ? 1 : -1;
  const levelRank = { high: 3, medium: 2, low: 1 };
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name, "zh-HK") * dir;
      case "helpCount":
        return (a.helpCount - b.helpCount) * dir;
      case "lastActiveAt":
        return (a.lastActiveAt ?? "").localeCompare(b.lastActiveAt ?? "") * dir;
      case "level":
        return (levelRank[a.level] - levelRank[b.level]) * dir;
      default:
        return (levelRank[b.level] - levelRank[a.level]) ||
          b.helpCount - a.helpCount;
    }
  });
}
