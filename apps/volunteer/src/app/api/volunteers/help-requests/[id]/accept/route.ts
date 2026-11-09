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

  const { data, error } = await supabase.rpc("accept_help_request", {
    target_id: id,
  });

  if (error) {
    return Response.json(
      { error: "accept_failed", detail: error.message },
      { status: 500 },
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return Response.json({ error: "already_taken" }, { status: 409 });
  }

  await supabase.from("activity_logs").insert({
    actor_type: "volunteer",
    actor_id: user.id,
    action: VolunteerActivityAction.accept,
    target_type: "help_request",
    target_id: row.id,
    metadata: {
      elder_id: row.elder_id,
      accepted_at: row.accepted_at,
      // Elder clients refresh via Realtime / polling on help_requests.
      notify_elder: true,
    },
  });

  return Response.json({
    ok: true,
    id: row.id,
    status: row.status,
    acceptedAt: row.accepted_at,
  });
}
