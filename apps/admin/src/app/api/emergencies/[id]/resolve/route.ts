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

  const note =
    typeof body === "object" &&
    body &&
    "note" in body &&
    typeof (body as { note: unknown }).note === "string"
      ? (body as { note: string }).note.trim()
      : "";

  if (!note || note.length < 2) {
    return Response.json({ error: "note_required" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await auth.ctx.supabase
    .from("emergencies")
    .select("id, status")
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
  if (existing.status !== "active") {
    return Response.json({ error: "invalid_transition" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await auth.ctx.supabase
    .from("emergencies")
    .update({
      status: "resolved",
      ended_at: now,
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
    action: AdminActivityAction.emergencyResolve,
    target_type: "emergency",
    target_id: id,
    metadata: {
      note,
      fromStatus: existing.status,
      toStatus: "resolved",
    },
  });

  return Response.json({ ok: true, status: "resolved", endedAt: now });
}
