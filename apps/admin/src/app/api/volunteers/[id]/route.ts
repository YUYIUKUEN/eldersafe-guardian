import {
  AdminActivityAction,
  validateVolunteerProfileInput,
} from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";
import { getVolunteerDetail } from "@/lib/management/volunteers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const detail = await getVolunteerDetail(
      auth.ctx.supabase,
      auth.ctx.service,
      id,
    );
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

  const validated = validateVolunteerProfileInput(
    (body ?? {}) as Record<string, unknown>,
  );
  if (!validated.value) {
    return Response.json(
      { error: "validation_failed", issues: validated.issues },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await auth.ctx.supabase
    .from("volunteers")
    .select("name, phone, age, service_areas, bio")
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

  const input = validated.value;
  const before = {
    name: existing.name,
    phone: existing.phone,
    age: existing.age,
    serviceAreas: existing.service_areas ?? [],
    bio: existing.bio ?? "",
  };
  const after = {
    name: input.name,
    phone: input.phone,
    age: input.age,
    serviceAreas: input.serviceAreas,
    bio: input.bio,
  };

  const { error: updateError } = await auth.ctx.supabase
    .from("volunteers")
    .update({
      name: input.name,
      phone: input.phone,
      age: input.age,
      service_areas: input.serviceAreas,
      bio: input.bio,
    })
    .eq("id", id);

  if (updateError) {
    return Response.json(
      { error: "update_failed", detail: updateError.message },
      { status: 500 },
    );
  }

  await auth.ctx.supabase
    .from("profiles")
    .update({ display_name: input.name })
    .eq("id", id);

  await auth.ctx.supabase.from("activity_logs").insert({
    actor_type: "admin",
    actor_id: auth.ctx.user.id,
    action: AdminActivityAction.volunteerUpdate,
    target_type: "volunteer",
    target_id: id,
    metadata: { before, after },
  });

  return Response.json({ ok: true });
}
