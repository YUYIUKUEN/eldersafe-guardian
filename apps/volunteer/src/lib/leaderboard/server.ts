import {
  getMonthCountdown,
  mapLeaderboardRows,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type MonthCountdown,
} from "@eldersafe/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LeaderboardPayload = {
  period: LeaderboardPeriod;
  yearMonth: string;
  countdown: MonthCountdown;
  entries: LeaderboardEntry[];
  self: LeaderboardEntry | null;
  anonymous: boolean;
  updatedAt: string;
};

export async function loadVolunteerLeaderboard(
  supabase: SupabaseClient,
  input: {
    userId: string;
    period: LeaderboardPeriod;
  },
): Promise<LeaderboardPayload> {
  const [{ data, error }, privacyRes] = await Promise.all([
    supabase.rpc("get_volunteer_leaderboard", {
      p_period: input.period,
    }),
    supabase
      .from("volunteers")
      .select("leaderboard_anonymous")
      .eq("id", input.userId)
      .maybeSingle(),
  ]);

  if (error) {
    throw new Error(error.message);
  }
  if (privacyRes.error) {
    throw new Error(privacyRes.error.message);
  }

  const entries = mapLeaderboardRows(
    (data ?? []) as Array<{
      volunteer_id: string;
      full_name: string;
      is_anonymous: boolean;
      points: number;
      completed_count: number;
      rank: number | string;
    }>,
    input.userId,
  );

  const self = entries.find((entry) => entry.isSelf) ?? null;
  const countdown = getMonthCountdown();

  return {
    period: input.period,
    yearMonth: countdown.yearMonth,
    countdown,
    entries,
    self,
    anonymous: Boolean(privacyRes.data?.leaderboard_anonymous),
    updatedAt: new Date().toISOString(),
  };
}

export function parseLeaderboardPeriod(
  value: string | null,
): LeaderboardPeriod {
  return value === "all" ? "all" : "month";
}
