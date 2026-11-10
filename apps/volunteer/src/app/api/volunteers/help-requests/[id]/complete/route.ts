import {
  canAccessVolunteerApp,
  loadAccessContext,
  VolunteerActivityAction,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

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

  const { data, error } = await supabase.rpc("complete_help_request", {
    target_id: id,
  });

  if (error) {
    return Response.json(
      { error: "complete_failed", detail: error.message },
      { status: 500 },
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return Response.json({ error: "not_completable" }, { status: 409 });
  }

  await supabase.from("activity_logs").insert({
    actor_type: "volunteer",
    actor_id: user.id,
    action: VolunteerActivityAction.complete,
    target_type: "help_request",
    target_id: row.id,
    metadata: {
      elder_id: row.elder_id,
      completed_at: row.completed_at,
      awaiting_elder_confirm: true,
      // Points awarded only after elder_confirmed_at (phase 5 hook).
      points_deferred: true,
      notify_elder: true,
    },
  });

  return Response.json({
    ok: true,
    id: row.id,
    status: row.status,
    completedAt: row.completed_at,
    awaitingElderConfirm: true,
  });
}
