import { AdminActivityAction } from "@eldersafe/shared";
import type { VolunteerApprovalStatus } from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";
import { nextVolunteerStatus } from "@/lib/management/volunteers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ACTIONS = new Set(["approve", "reject", "disable", "reactivate"]);

const ACTION_LOG: Record<
  "approve" | "reject" | "disable" | "reactivate",
  (typeof AdminActivityAction)[keyof typeof AdminActivityAction]
> = {
  approve: AdminActivityAction.volunteerApprove,
  reject: AdminActivityAction.volunteerReject,
  disable: AdminActivityAction.volunteerDisable,
  reactivate: AdminActivityAction.volunteerReactivate,
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const action =
    typeof body === "object" &&
    body &&
    "action" in body &&
    typeof (body as { action: unknown }).action === "string"
      ? (body as { action: string }).action
      : null;

  if (!action || !ACTIONS.has(action)) {
    return Response.json({ error: "invalid_action" }, { status: 400 });
  }

  const typedAction = action as
    | "approve"
    | "reject"
    | "disable"
    | "reactivate";

  const { data: existing, error: existingError } = await auth.ctx.supabase
    .from("volunteers")
    .select("approval_status")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return Response.json(
      { error: "load_failed", detail: existingError.message },
      { status: 500 },
    );
  }
  if (!existing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const fromStatus = existing.approval_status as VolunteerApprovalStatus;
  const toStatus = nextVolunteerStatus(typedAction, fromStatus);
  if (!toStatus) {
    return Response.json({ error: "invalid_transition" }, { status: 409 });
  }

  const { error: updateError } = await auth.ctx.supabase
    .from("volunteers")
    .update({ approval_status: toStatus })
    .eq("id", id);

  if (updateError) {
    return Response.json(
      { error: "update_failed", detail: updateError.message },
      { status: 500 },
    );
  }

  await auth.ctx.supabase.from("activity_logs").insert({
    actor_type: "admin",
    actor_id: auth.ctx.user.id,
    action: ACTION_LOG[typedAction],
    target_type: "volunteer",
    target_id: id,
    metadata: { from: fromStatus, to: toStatus, action: typedAction },
  });

  return Response.json({ ok: true, status: toStatus });
}
