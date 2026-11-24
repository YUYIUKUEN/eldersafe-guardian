import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ratingSentiment,
  type RatingSentiment,
} from "@eldersafe/shared";

export type EngagementCaseItem = {
  id: string;
  shortId: string;
  status: string;
  elderId: string;
  elderName: string;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  elderConfirmedAt: string | null;
  elderRating: number | null;
  sentiment: RatingSentiment;
  needsFollowUp: boolean;
};

type HelpRow = {
  id: string;
  status: string;
  elder_id: string;
  elder_rating: number | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  elder_confirmed_at: string | null;
  elders: { name: string } | { name: string }[] | null;
};

function oneRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Cases for one volunteer on the active-volunteer ranking drill-down,
 * including elder praise / criticism (star rating sentiment).
 */
export async function listVolunteerEngagementCases(
  supabase: SupabaseClient,
  volunteerId: string,
): Promise<{
  volunteer: { id: string; name: string } | null;
  cases: EngagementCaseItem[];
}> {
  const [volunteerRes, helpsRes] = await Promise.all([
    supabase
      .from("volunteers")
      .select("id, name")
      .eq("id", volunteerId)
      .maybeSingle(),
    supabase
      .from("help_requests")
      .select(
        "id, status, elder_id, elder_rating, created_at, accepted_at, completed_at, elder_confirmed_at, elders(name)",
      )
      .eq("volunteer_id", volunteerId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (volunteerRes.error) throw new Error(volunteerRes.error.message);
  if (helpsRes.error) throw new Error(helpsRes.error.message);

  const volunteer = volunteerRes.data
    ? {
        id: volunteerRes.data.id as string,
        name: volunteerRes.data.name as string,
      }
    : null;

  const cases = ((helpsRes.data ?? []) as HelpRow[]).map((row) => {
    const elder = oneRelation(row.elders);
    const elderRating =
      row.elder_rating == null ? null : Number(row.elder_rating);
    const sentiment = ratingSentiment(elderRating);
    return {
      id: row.id,
      shortId: row.id.slice(0, 8),
      status: row.status,
      elderId: row.elder_id,
      elderName: elder?.name ?? "—",
      createdAt: row.created_at,
      acceptedAt: row.accepted_at,
      completedAt: row.completed_at,
      elderConfirmedAt: row.elder_confirmed_at,
      elderRating,
      sentiment,
      needsFollowUp: sentiment === "negative",
    };
  });

  return { volunteer, cases };
}
