import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeVolunteerTags,
  type VolunteerTag,
} from "@eldersafe/shared";

type HelpActivityRow = {
  volunteer_id: string | null;
  status: string;
  accepted_at: string | null;
  completed_at: string | null;
};

function maxIso(values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  for (const value of values) {
    if (!value) continue;
    if (!best || value > best) best = value;
  }
  return best;
}

function daysAgoIso(days: number, nowMs = Date.now()): string {
  return new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Batch-compute background tags for a set of volunteer ids from help_requests.
 */
export async function loadVolunteerTagsMap(
  supabase: SupabaseClient,
  volunteerIds: string[],
  nowMs = Date.now(),
): Promise<Map<string, VolunteerTag[]>> {
  const map = new Map<string, VolunteerTag[]>();
  for (const id of volunteerIds) map.set(id, []);
  if (volunteerIds.length === 0) return map;

  const { data, error } = await supabase
    .from("help_requests")
    .select("volunteer_id, status, accepted_at, completed_at")
    .in("volunteer_id", volunteerIds);

  if (error) throw new Error(error.message);

  const stats = new Map<
    string,
    {
      totalCompleted: number;
      completedLast30Days: number;
      lastServedAt: string | null;
    }
  >();
  for (const id of volunteerIds) {
    stats.set(id, {
      totalCompleted: 0,
      completedLast30Days: 0,
      lastServedAt: null,
    });
  }

  const cutoff30 = daysAgoIso(30, nowMs);

  for (const row of (data ?? []) as HelpActivityRow[]) {
    const id = row.volunteer_id;
    if (!id) continue;
    const bucket = stats.get(id);
    if (!bucket) continue;

    bucket.lastServedAt = maxIso([
      bucket.lastServedAt,
      row.accepted_at,
      row.completed_at,
    ]);

    if (row.status === "completed") {
      bucket.totalCompleted += 1;
      if (row.completed_at && row.completed_at >= cutoff30) {
        bucket.completedLast30Days += 1;
      }
    }
  }

  for (const [id, bucket] of stats) {
    map.set(
      id,
      computeVolunteerTags({
        totalCompleted: bucket.totalCompleted,
        completedLast30Days: bucket.completedLast30Days,
        lastServedAt: bucket.lastServedAt,
        nowMs,
      }),
    );
  }

  return map;
}
