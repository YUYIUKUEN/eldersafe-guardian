import { isValidYearMonth, hongKongYearMonth } from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";
import { loadMonthLeaderboard } from "@/lib/management/leaderboard";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const yearMonth =
    url.searchParams.get("yearMonth")?.trim() || hongKongYearMonth();

  if (!isValidYearMonth(yearMonth)) {
    return Response.json({ error: "invalid_year_month" }, { status: 400 });
  }

  try {
    // Prefer the admin user session so get_monthly_leaderboard's role gate
    // passes even before migration 013 (service_role allow) is applied.
    let payload: Awaited<ReturnType<typeof loadMonthLeaderboard>>;
    try {
      payload = await loadMonthLeaderboard(auth.ctx.supabase, yearMonth, 10);
    } catch {
      payload = await loadMonthLeaderboard(auth.ctx.service, yearMonth, 10);
    }
    return Response.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "leaderboard_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
