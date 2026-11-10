import { AdminActivityAction } from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";

type RouteContext = {
  params: Promise<{ id: string }>;
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

  const volunteerId =
    typeof body === "object" &&
    body &&
    "volunteerId" in body &&
    typeof (body as { volunteerId: unknown }).volunteerId === "string"
      ? (body as { volunteerId: string }).volunteerId.trim()
      : "";
  const reason =
    typeof body === "object" &&
    body &&
    "reason" in body &&
    typeof (body as { reason: unknown }).reason === "string"
      ? (body as { reason: string }).reason.trim()
      : "";

  if (!volunteerId) {
    return Response.json({ error: "volunteer_required" }, { status: 400 });
  }
  if (!reason || reason.length < 2) {
    return Response.json({ error: "reason_required" }, { status: 400 });
  }
  if (reason.length > 500) {
    return Response.json({ error: "reason_too_long" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await auth.ctx.supabase
    .from("help_requests")
    .select("id, status, volunteer_id")
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
  if (existing.status === "completed" || existing.status === "cancelled") {
    return Response.json({ error: "invalid_transition" }, { status: 409 });
  }

  const { data: volunteer, error: volunteerError } = await auth.ctx.supabase
    .from("volunteers")
    .select("id, name, approval_status")
    .eq("id", volunteerId)
    .maybeSingle();

  if (volunteerError) {
    return Response.json(
      { error: "load_failed", detail: volunteerError.message },
      { status: 500 },
    );
  }
  if (!volunteer || volunteer.approval_status !== "approved") {
    return Response.json({ error: "volunteer_not_approved" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await auth.ctx.supabase
    .from("help_requests")
    .update({
      volunteer_id: volunteerId,
      status: "accepted",
      accepted_at: now,
      cancelled_at: null,
    })
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
    action: AdminActivityAction.helpReassign,
    target_type: "help_request",
    target_id: id,
    metadata: {
      reason,
      fromStatus: existing.status,
      fromVolunteerId: existing.volunteer_id,
      toVolunteerId: volunteerId,
      toVolunteerName: volunteer.name,
    },
  });

  return Response.json({
    ok: true,
    status: "accepted",
    volunteerId,
    volunteerName: volunteer.name,
  });
}
