import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardDayCount = {
  date: string;
  label: string;
  count: number;
};

export type DashboardStats = {
  eldersTotal: number;
  volunteersApproved: number;
  volunteersPending: number;
  helpToday: number;
  helpPending: number;
  emergenciesActive: number;
  completedMonth: number;
  helpLast7Days: DashboardDayCount[];
};

type CountResult = { count: number | null; error: { message: string } | null };

function hkDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

/** Hong Kong calendar midnight as UTC ISO (HKT is UTC+8 year-round). */
function hkMidnightIso(year: string, month: string, day: string) {
  return new Date(`${year}-${month}-${day}T00:00:00+08:00`).toISOString();
}

function shiftHkDay(parts: { year: string; month: string; day: string }, delta: number) {
  const base = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00+08:00`);
  base.setTime(base.getTime() + delta * 24 * 60 * 60 * 1000);
  return hkDateParts(base);
}

function countOrZero(result: CountResult) {
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

export async function loadDashboardStats(
  supabase: SupabaseClient,
): Promise<DashboardStats> {
  const today = hkDateParts(new Date());
  const todayStart = hkMidnightIso(today.year, today.month, today.day);
  const tomorrow = shiftHkDay(today, 1);
  const tomorrowStart = hkMidnightIso(tomorrow.year, tomorrow.month, tomorrow.day);

  const monthStart = hkMidnightIso(today.year, today.month, "01");
  const nextMonthParts =
    today.month === "12"
      ? { year: String(Number(today.year) + 1), month: "01", day: "01" }
      : {
          year: today.year,
          month: String(Number(today.month) + 1).padStart(2, "0"),
          day: "01",
        };
  const nextMonthStart = hkMidnightIso(
    nextMonthParts.year,
    nextMonthParts.month,
    nextMonthParts.day,
  );

  const sevenDaysAgo = shiftHkDay(today, -6);
  const sevenDaysStart = hkMidnightIso(
    sevenDaysAgo.year,
    sevenDaysAgo.month,
    sevenDaysAgo.day,
  );

  const [
    eldersTotal,
    volunteersApproved,
    volunteersPending,
    helpToday,
    helpPending,
    emergenciesActive,
    completedMonth,
    recentHelp,
  ] = await Promise.all([
    supabase.from("elders").select("id", { count: "exact", head: true }),
    supabase
      .from("volunteers")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "approved"),
    supabase
      .from("volunteers")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending"),
    supabase
      .from("help_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart)
      .lt("created_at", tomorrowStart),
    supabase
      .from("help_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("emergencies")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("help_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", monthStart)
      .lt("completed_at", nextMonthStart),
    supabase
      .from("help_requests")
      .select("created_at")
      .gte("created_at", sevenDaysStart)
      .lt("created_at", tomorrowStart),
  ]);

  if (recentHelp.error) {
    throw new Error(recentHelp.error.message);
  }

  const buckets = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    const day = shiftHkDay(sevenDaysAgo, i);
    const key = `${day.year}-${day.month}-${day.day}`;
    buckets.set(key, 0);
  }

  for (const row of recentHelp.data ?? []) {
    const parts = hkDateParts(new Date(row.created_at));
    const key = `${parts.year}-${parts.month}-${parts.day}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  const helpLast7Days: DashboardDayCount[] = [...buckets.entries()].map(
    ([date, count]) => ({
      date,
      label: date.slice(5),
      count,
    }),
  );

  return {
    eldersTotal: countOrZero(eldersTotal),
    volunteersApproved: countOrZero(volunteersApproved),
    volunteersPending: countOrZero(volunteersPending),
    helpToday: countOrZero(helpToday),
    helpPending: countOrZero(helpPending),
    emergenciesActive: countOrZero(emergenciesActive),
    completedMonth: countOrZero(completedMonth),
    helpLast7Days,
  };
}
