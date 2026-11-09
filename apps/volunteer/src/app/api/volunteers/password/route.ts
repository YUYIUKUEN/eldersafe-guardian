import {
  canAccessVolunteerApp,
  loadAccessContext,
  validateResetPasswordInput,
  VolunteerActivityAction,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const validated = validateResetPasswordInput(
    (body ?? {}) as { password?: unknown },
  );
  if (!validated.value) {
    return Response.json(
      { error: "validation_failed", issues: validated.issues },
      { status: 400 },
    );
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

  const { error } = await supabase.auth.updateUser({
    password: validated.value.password,
  });

  if (error) {
    return Response.json(
      { error: "password_change_failed", detail: error.message },
      { status: 500 },
    );
  }

  await supabase.from("activity_logs").insert({
    actor_type: "volunteer",
    actor_id: user.id,
    action: VolunteerActivityAction.passwordChange,
    target_type: "volunteer",
    target_id: user.id,
    metadata: null,
  });

  return Response.json({ ok: true });
}
