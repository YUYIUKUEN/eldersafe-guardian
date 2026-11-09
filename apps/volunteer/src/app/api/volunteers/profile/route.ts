import {
  canAccessVolunteerApp,
  loadAccessContext,
  validateVolunteerProfileInput,
  VolunteerActivityAction,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  const { data, error } = await supabase
    .from("volunteers")
    .select("name, phone, age, service_areas, bio, approval_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({
    email: user.email ?? null,
    name: data.name,
    phone: data.phone,
    age: data.age,
    serviceAreas: data.service_areas ?? [],
    bio: data.bio ?? "",
    approvalStatus: data.approval_status,
  });
}

export async function PATCH(request: Request) {
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

  const input = validated.value;

  const { error: volunteerError } = await supabase
    .from("volunteers")
    .update({
      name: input.name,
      phone: input.phone,
      age: input.age,
      service_areas: input.serviceAreas,
      bio: input.bio,
    })
    .eq("id", user.id);

  if (volunteerError) {
    return Response.json(
      { error: "update_failed", detail: volunteerError.message },
      { status: 500 },
    );
  }

  await supabase
    .from("profiles")
    .update({ display_name: input.name })
    .eq("id", user.id);

  await supabase.from("activity_logs").insert({
    actor_type: "volunteer",
    actor_id: user.id,
    action: VolunteerActivityAction.profileUpdate,
    target_type: "volunteer",
    target_id: user.id,
    metadata: {
      name: input.name,
      phone: input.phone,
      age: input.age,
      service_areas: input.serviceAreas,
    },
  });

  return Response.json({ ok: true });
}
