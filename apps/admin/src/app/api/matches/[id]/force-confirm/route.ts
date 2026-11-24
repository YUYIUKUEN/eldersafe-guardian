import {
  calculatePointsAward,
  isUuid,
  jsonSafeError,
} from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function rpcMessage(error: { message?: string }): string {
  return error.message ?? "";
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const { data: existing, error: loadError } = await auth.ctx.supabase
    .from("help_requests")
    .select(
      "id, status, accepted_at, completed_at, elder_confirmed_at, volunteer_id, elder_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return jsonSafeError(loadError, "load_failed", 500);
  }
  if (!existing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (
    existing.status !== "accepted" ||
    !existing.completed_at ||
    existing.elder_confirmed_at ||
    !existing.volunteer_id ||
    !existing.accepted_at
  ) {
    return Response.json({ error: "not_confirmable" }, { status: 409 });
  }

  const completedMs = Date.parse(existing.completed_at as string);
  if (
    !Number.isFinite(completedMs) ||
    Date.now() - completedMs < 24 * 60 * 60 * 1000
  ) {
    return Response.json({ error: "not_overdue" }, { status: 409 });
  }

  const scored = calculatePointsAward({
    acceptedAt: existing.accepted_at as string,
    completedAt: existing.completed_at as string,
    rating: null,
  });

  const { data, error } = await auth.ctx.supabase.rpc(
    "admin_force_confirm_help_request",
    {
      target_id: id,
      p_points: scored.total,
      p_breakdown: scored.breakdown,
    },
  );

  if (error) {
    const message = rpcMessage(error);
    if (message.includes("HELP_REQUEST_NOT_OVERDUE")) {
      return Response.json({ error: "not_overdue" }, { status: 409 });
    }
    if (
      message.includes("HELP_REQUEST_NOT_CONFIRMABLE") ||
      message.includes("HELP_REQUEST_NOT_FOUND")
    ) {
      return Response.json({ error: "not_confirmable" }, { status: 409 });
    }
    return jsonSafeError(error, "force_confirm_failed", 500);
  }

  return Response.json({
    ok: true,
    result: data,
    points: scored.total,
    breakdown: scored.breakdown,
  });
}
