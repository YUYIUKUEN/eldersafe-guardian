import {
  canAccessVolunteerApp,
  loadAccessContext,
  VolunteerActivityAction,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const reason =
    typeof body === "object" &&
    body &&
    "reason" in body &&
    typeof (body as { reason?: unknown }).reason === "string"
      ? (body as { reason: string }).reason.trim()
      : "";

  if (reason.length < 2) {
    return Response.json({ error: "reason_required" }, { status: 400 });
  }
  if (reason.length > 500) {
    return Response.json({ error: "reason_too_long" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return Response.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const access = await loadAccessContext(supabase, user.id);
  if (!canAccessVolunteerApp(access)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.rpc("release_help_request", {
    target_id: id,
    reason,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("release_reason")) {
      return Response.json({ error: "reason_required" }, { status: 400 });
    }
    return Response.json(
      { error: "release_failed", detail: error.message },
      { status: 500 },
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return Response.json({ error: "not_assigned" }, { status: 409 });
  }

  await supabase.from("activity_logs").insert({
    actor_type: "volunteer",
    actor_id: user.id,
    action: VolunteerActivityAction.release,
    target_type: "help_request",
    target_id: row.id,
    metadata: {
      elder_id: row.elder_id,
      reason,
      notify_elder: true,
    },
  });

  return Response.json({ ok: true, id: row.id, status: row.status });
}
