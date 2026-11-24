import {
  AdminActivityAction,
  isUuid,
  jsonSafeError,
  readJsonBody,
  toSafeErrorCode,
} from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const parsed = await readJsonBody<unknown>(request, 4096);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.value;

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
  if (note.length > 500) {
    return Response.json({ error: "note_too_long" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await auth.ctx.supabase
    .from("emergencies")
    .select("id, status, police_share_expires_at")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return jsonSafeError(existingError, "load_failed", 500);
  }
  if (!existing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.status !== "active") {
    return Response.json({ error: "invalid_transition" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const existingExpiry =
    typeof existing.police_share_expires_at === "string"
      ? existing.police_share_expires_at
      : null;
  const existingMs = existingExpiry ? Date.parse(existingExpiry) : Number.NaN;
  const graceMs = Date.parse(now) + 2 * 60 * 60 * 1000;
  const expiresAt = new Date(
    Number.isFinite(existingMs) ? Math.min(existingMs, graceMs) : graceMs,
  ).toISOString();

  const { error: updateError } = await auth.ctx.supabase
    .from("emergencies")
    .update({
      status: "resolved",
      ended_at: now,
      police_share_expires_at: expiresAt,
    })
    .eq("id", id);

  if (updateError) {
    return jsonSafeError(updateError, "update_failed", 500);
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
