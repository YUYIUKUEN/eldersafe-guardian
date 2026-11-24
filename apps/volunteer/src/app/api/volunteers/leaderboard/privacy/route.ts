import {
  canAccessVolunteerApp,
  loadAccessContext,
  VolunteerActivityAction,
  jsonSafeError,
  readJsonBody,
  toSafeErrorCode,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const parsed = await readJsonBody<unknown>(request);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.value;

  const anonymous =
    typeof body === "object" &&
    body !== null &&
    "anonymous" in body &&
    typeof (body as { anonymous: unknown }).anonymous === "boolean"
      ? (body as { anonymous: boolean }).anonymous
      : null;

  if (anonymous == null) {
    return Response.json({ error: "invalid_anonymous" }, { status: 400 });
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

  const { error } = await supabase
    .from("volunteers")
    .update({ leaderboard_anonymous: anonymous })
    .eq("id", user.id);

  if (error) {
    return jsonSafeError(error, "update_failed", 500);
  }

  await supabase.from("activity_logs").insert({
    actor_type: "volunteer",
    actor_id: user.id,
    action: VolunteerActivityAction.leaderboardPrivacyUpdate,
    target_type: "volunteer",
    target_id: user.id,
    metadata: { leaderboardAnonymous: anonymous },
  });

  return Response.json({ ok: true, anonymous });
}
