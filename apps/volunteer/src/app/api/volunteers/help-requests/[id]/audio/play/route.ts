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

  const { data: allowed, error: allowError } = await supabase.rpc(
    "volunteer_can_access_help_request",
    { target_id: id },
  );
  if (allowError || !allowed) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("help_requests")
    .select("id, elder_id, audio_path")
    .eq("id", id)
    .maybeSingle();

  if (requestError || !requestRow) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const { error: logError } = await supabase.from("activity_logs").insert({
    actor_type: "volunteer",
    actor_id: user.id,
    action: VolunteerActivityAction.audioPlay,
    target_type: "help_request",
    target_id: requestRow.id,
    metadata: {
      elder_id: requestRow.elder_id,
      audio_path: requestRow.audio_path,
      listened_at: new Date().toISOString(),
    },
  });

  if (logError) {
    return Response.json(
      { error: "log_failed", detail: logError.message },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
