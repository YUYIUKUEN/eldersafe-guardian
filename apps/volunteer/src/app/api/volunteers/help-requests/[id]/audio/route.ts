import {
  canAccessVolunteerApp,
  createSupabaseServiceClient,
  loadAccessContext,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 5;

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
    return Response.json({ error: "access_check_failed" }, { status: 500 });
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

  // Older rows may have stored "voice-recordings/..." with the bucket prefix.
  const rawPath = String(requestRow.audio_path);
  const objectPath = rawPath.startsWith("voice-recordings/")
    ? rawPath.slice("voice-recordings/".length)
    : rawPath;

  // Service role signs the URL after access checks — storage objects have no
  // authenticated SELECT policy (migration 012).
  let service;
  try {
    service = createSupabaseServiceClient();
  } catch {
    return Response.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const { data: signed, error: signError } = await service.storage
    .from("voice-recordings")
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    return Response.json({ error: "sign_failed" }, { status: 500 });
  }

  return Response.json({
    url: signed.signedUrl,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
  });
}
