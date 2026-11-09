import { AdminActivityAction } from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ACTIONS = new Set(["disable", "reactivate"]);

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const action =
    typeof body === "object" &&
    body &&
    "action" in body &&
    typeof (body as { action: unknown }).action === "string"
      ? (body as { action: string }).action
      : null;

  if (!action || !ACTIONS.has(action)) {
    return Response.json({ error: "invalid_action" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await auth.ctx.supabase
    .from("elders")
    .select("is_disabled")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return Response.json(
      { error: "load_failed", detail: existingError.message },
      { status: 500 },
    );
  }
  if (!existing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const disable = action === "disable";
  if (existing.is_disabled === disable) {
    return Response.json({ error: "invalid_transition" }, { status: 409 });
  }

  const { error: updateError } = await auth.ctx.supabase
    .from("elders")
    .update({ is_disabled: disable })
    .eq("id", id);

  if (updateError) {
    return Response.json(
      { error: "update_failed", detail: updateError.message },
      { status: 500 },
    );
  }

  await auth.ctx.supabase.from("activity_logs").insert({
    actor_type: "admin",
    actor_id: auth.ctx.user.id,
    action: disable
      ? AdminActivityAction.elderDisable
      : AdminActivityAction.elderReactivate,
    target_type: "elder",
    target_id: id,
    metadata: {
      from: existing.is_disabled ? "disabled" : "active",
      to: disable ? "disabled" : "active",
      action,
    },
  });

  return Response.json({
    ok: true,
    isDisabled: disable,
  });
}
