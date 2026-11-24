import {
  canAccessVolunteerApp,
  createSupabaseServiceClient,
  loadAccessContext,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 5;
const PROOF_BUCKET = "completion-proofs";

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
    .select("completion_photo_path, completion_notes, volunteer_id")
    .eq("id", id)
    .maybeSingle();

  if (requestError || !requestRow) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (requestRow.volunteer_id !== user.id) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  if (!requestRow.completion_photo_path) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  let service;
  try {
    service = createSupabaseServiceClient();
  } catch {
    return Response.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const { data: signed, error: signError } = await service.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(String(requestRow.completion_photo_path), SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    return Response.json({ error: "sign_failed" }, { status: 500 });
  }

  return Response.json({
    url: signed.signedUrl,
    notes: requestRow.completion_notes ?? null,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
  });
}
