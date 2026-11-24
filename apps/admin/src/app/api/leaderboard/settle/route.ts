import {
  AdminActivityAction,
  isValidYearMonth,
  jsonSafeError,
  readJsonBody,
  toSafeErrorCode,
} from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";
import { settleMonthLeaderboard } from "@/lib/management/leaderboard";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = await readJsonBody<{
    yearMonth?: string;
    podiumVolunteerIds?: string[];
  }>(request);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.value;

  const yearMonth = body.yearMonth?.trim() ?? "";
  if (!isValidYearMonth(yearMonth)) {
    return Response.json({ error: "invalid_year_month" }, { status: 400 });
  }

  try {
    const result = await settleMonthLeaderboard(
      auth.ctx.supabase,
      auth.ctx.service,
      {
        yearMonth,
        adminId: auth.ctx.user.id,
        podiumVolunteerIds: body.podiumVolunteerIds,
      },
    );

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
    const code = toSafeErrorCode(error, "settle_failed");
    const status =
      code === "MONTH_ALREADY_SETTLED"
        ? 409
        : code === "PODIUM_DECISION_REQUIRED" ||
            code === "INVALID_PODIUM_SELECTION" ||
            code === "INVALID_PODIUM_SELECTION_COUNT" ||
            code === "DUPLICATE_PODIUM_SELECTION" ||
            code === "PODIUM_ORDER_VIOLATES_SCORES" ||
            code === "PODIUM_NOT_ELIGIBLE" ||
            code === "NO_RANKING_DATA" ||
            code === "NO_PODIUM"
          ? 400
          : 500;
    return Response.json({ error: code }, { status });
  }
}
