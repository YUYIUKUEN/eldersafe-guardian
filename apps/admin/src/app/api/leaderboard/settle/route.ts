import {
  AdminActivityAction,
  isValidYearMonth,
} from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";
import { settleMonthLeaderboard } from "@/lib/management/leaderboard";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: {
    yearMonth?: string;
    podiumVolunteerIds?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const yearMonth = body.yearMonth?.trim() ?? "";
  if (!isValidYearMonth(yearMonth)) {
    return Response.json({ error: "invalid_year_month" }, { status: 400 });
  }

  try {
    const result = await settleMonthLeaderboard(auth.ctx.service, {
      yearMonth,
      adminId: auth.ctx.user.id,
      podiumVolunteerIds: body.podiumVolunteerIds,
    });

    await auth.ctx.service.from("activity_logs").insert({
      actor_type: "admin",
      actor_id: auth.ctx.user.id,
      action: AdminActivityAction.leaderboardSettle,
      target_type: "leaderboard_settlement",
      target_id: yearMonth,
      metadata: {
        yearMonth,
        podium: result.settlement.podium,
        certificateIds: result.certificates.map((item) => item.id),
      },
    });

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "settle_failed";
    const status =
      message === "MONTH_ALREADY_SETTLED"
        ? 409
        : message === "PODIUM_DECISION_REQUIRED" ||
            message === "INVALID_PODIUM_SELECTION" ||
            message === "INVALID_PODIUM_SELECTION_COUNT" ||
            message === "DUPLICATE_PODIUM_SELECTION" ||
            message === "PODIUM_ORDER_VIOLATES_SCORES" ||
            message === "PODIUM_NOT_ELIGIBLE" ||
            message === "NO_RANKING_DATA" ||
            message === "NO_PODIUM"
          ? 400
          : 500;
    return Response.json({ error: message }, { status });
  }
}
