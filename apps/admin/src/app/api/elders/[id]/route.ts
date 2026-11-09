import {
  AdminActivityAction,
  encodeEmergencyContact,
  validateElderProfileInput,
} from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";
import { getElderDetail } from "@/lib/management/elders";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const detail = await getElderDetail(auth.ctx.supabase, id);
    if (!detail) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json(detail);
  } catch (error) {
    return Response.json(
      {
        error: "load_failed",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const validated = validateElderProfileInput(
    (body ?? {}) as Record<string, unknown>,
  );
  if (!validated.value) {
    return Response.json(
      { error: "validation_failed", issues: validated.issues },
      { status: 400 },
    );
  }

  const detail = await getElderDetail(auth.ctx.supabase, id);
  if (!detail) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const input = validated.value;
  const before = {
    name: detail.name,
    age: detail.age,
    phone: detail.phone,
    address: detail.address,
    emergencyContact: detail.emergencyContact,
    healthNotes: detail.healthNotes,
    language: detail.language,
  };
  const after = {
    name: input.name,
    age: input.age,
    phone: input.phone,
    address: input.address,
    emergencyContact: input.emergencyContact,
    healthNotes: input.healthNotes,
    language: input.language,
  };

  const { error: updateError } = await auth.ctx.supabase
    .from("elders")
    .update({
      name: input.name,
      age: input.age,
      phone: input.phone,
      address: input.address,
      emergency_contact: encodeEmergencyContact(input.emergencyContact),
      health_notes: input.healthNotes,
      language: input.language,
    })
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
    action: AdminActivityAction.elderUpdate,
    target_type: "elder",
    target_id: id,
    metadata: { before, after },
  });

  return Response.json({ ok: true });
}
