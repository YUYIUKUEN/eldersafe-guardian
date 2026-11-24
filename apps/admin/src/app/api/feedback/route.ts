import { requireAdminApi } from "@/lib/auth/api";
import {
  listFeedback,
  type FeedbackSentimentFilter,
} from "@/lib/management/feedback";

const SENTIMENT_FILTERS = new Set<FeedbackSentimentFilter>([
  "all",
  "positive",
  "negative",
  "neutral",
  "needs_follow_up",
]);

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const rawSentiment = url.searchParams.get("sentiment") ?? "all";
  const sentiment = SENTIMENT_FILTERS.has(
    rawSentiment as FeedbackSentimentFilter,
  )
    ? (rawSentiment as FeedbackSentimentFilter)
    : "all";

  try {
    const result = await listFeedback(auth.ctx.supabase, {
      page: Number.isFinite(page) ? page : 1,
      sentiment,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: "load_failed",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
