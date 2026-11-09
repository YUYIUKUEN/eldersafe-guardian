import {
  canAccessVolunteerApp,
  loadAccessContext,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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
  if (allowError) {
    return Response.json(
      { error: "access_check_failed", detail: allowError.message },
      { status: 500 },
    );
  }
  if (!allowed) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("help_requests")
    .select("audio_path")
    .eq("id", id)
    .maybeSingle();

  if (requestError || !requestRow?.audio_path) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("voice-recordings")
    .createSignedUrl(requestRow.audio_path, 60 * 10);

  if (signError || !signed?.signedUrl) {
    return Response.json(
      { error: "sign_failed", detail: signError?.message },
      { status: 500 },
    );
  }

  return Response.json({ url: signed.signedUrl });
}
