import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ratingSentiment,
  type RatingSentiment,
} from "@eldersafe/shared";

export const FEEDBACK_PAGE_SIZE = 20;

export type FeedbackSentimentFilter =
  | "all"
  | RatingSentiment
  | "needs_follow_up";

export type FeedbackListItem = {
  id: string;
  shortId: string;
  elderId: string;
  elderName: string;
  volunteerId: string | null;
  volunteerName: string | null;
  status: string;
  elderRating: number | null;
  sentiment: RatingSentiment;
  needsFollowUp: boolean;
  createdAt: string;
  completedAt: string | null;
  elderConfirmedAt: string | null;
};

type HelpRow = {
  id: string;
  status: string;
  elder_id: string;
  volunteer_id: string | null;
  elder_rating: number | null;
  created_at: string;
  completed_at: string | null;
  elder_confirmed_at: string | null;
  elders: { name: string } | { name: string }[] | null;
  volunteers: { name: string } | { name: string }[] | null;
};

function oneRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapItem(row: HelpRow): FeedbackListItem {
  const elder = oneRelation(row.elders);
  const volunteer = oneRelation(row.volunteers);
  const elderRating =
    row.elder_rating == null ? null : Number(row.elder_rating);
  const sentiment = ratingSentiment(elderRating);
  return {
    id: row.id,
    shortId: row.id.slice(0, 8),
    elderId: row.elder_id,
    elderName: elder?.name ?? "—",
    volunteerId: row.volunteer_id,
    volunteerName: volunteer?.name ?? null,
    status: row.status,
    elderRating,
    sentiment,
    needsFollowUp: sentiment === "negative",
    createdAt: row.created_at,
    completedAt: row.completed_at,
    elderConfirmedAt: row.elder_confirmed_at,
  };
}

/**
 * Feedback form submissions = elder-confirmed help requests that have a
 * stored star rating (the confirm-complete form from the elder app).
 */
export async function listFeedback(
  supabase: SupabaseClient,
  input: {
    sentiment?: FeedbackSentimentFilter;
    page?: number;
    pageSize?: number;
  },
) {
  const page = input.page && input.page > 0 ? input.page : 1;
  const pageSize =
    input.pageSize && input.pageSize > 0 ? input.pageSize : FEEDBACK_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filter = input.sentiment ?? "all";

  // Fetch a wider window when filtering by derived sentiment, then page in memory.
  const needsClientFilter =
    filter === "positive" ||
    filter === "negative" ||
    filter === "neutral" ||
    filter === "needs_follow_up";

  let query = supabase
    .from("help_requests")
    .select(
      "id, status, elder_id, volunteer_id, elder_rating, created_at, completed_at, elder_confirmed_at, elders(name), volunteers(name)",
      { count: "exact" },
    )
    .not("elder_confirmed_at", "is", null)
    .not("elder_rating", "is", null)
    .order("elder_confirmed_at", { ascending: false });

  if (!needsClientFilter) {
    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);
    return {
      page,
      pageSize,
      total: count ?? 0,
      items: ((data ?? []) as HelpRow[]).map(mapItem),
    };
  }

  // Cap at 2000 for admin browsing; sentiment filters are rare at larger scale.
  const { data, error } = await query.limit(2000);
  if (error) throw new Error(error.message);

  let items = ((data ?? []) as HelpRow[]).map(mapItem);
  if (filter === "needs_follow_up") {
    items = items.filter((item) => item.needsFollowUp);
  } else if (
    filter === "positive" ||
    filter === "negative" ||
    filter === "neutral"
  ) {
    items = items.filter((item) => item.sentiment === filter);
  }

  const total = items.length;
  return {
    page,
    pageSize,
    total,
    items: items.slice(from, to + 1),
  };
}
