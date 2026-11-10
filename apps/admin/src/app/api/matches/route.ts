import { parsePositiveInt, requireAdminApi } from "@/lib/auth/api";
import {
  listMatches,
  MATCH_PAGE_SIZE,
  type HelpRequestStatus,
} from "@/lib/management/matches";

const STATUSES = new Set([
  "all",
  "pending",
  "accepted",
  "completed",
  "cancelled",
]);

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const statusRaw = url.searchParams.get("status") ?? "all";
  const status = STATUSES.has(statusRaw)
    ? (statusRaw as HelpRequestStatus | "all")
    : "all";
  const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
  const dateTo = url.searchParams.get("dateTo") ?? undefined;
  const elderId = url.searchParams.get("elderId") || undefined;
  const volunteerId = url.searchParams.get("volunteerId") || undefined;
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(
    url.searchParams.get("pageSize"),
    MATCH_PAGE_SIZE,
    100,
  );

  try {
    const result = await listMatches(auth.ctx.supabase, {
      status,
      dateFrom,
      dateTo,
      elderId,
      volunteerId,
      page,
      pageSize,
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
