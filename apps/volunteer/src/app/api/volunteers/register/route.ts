import {
  createSupabaseServiceClient,
  validateVolunteerRegisterInput,
  VolunteerActivityAction,
} from "@eldersafe/shared";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const validated = validateVolunteerRegisterInput(
    (body ?? {}) as Record<string, unknown>,
  );
  if (!validated.value) {
    return Response.json(
      { error: "validation_failed", issues: validated.issues },
      { status: 400 },
    );
  }

  const input = validated.value;

  let service;
  try {
    service = createSupabaseServiceClient();
  } catch {
    return Response.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        role: "volunteer",
        display_name: input.name,
      },
    });

  if (createError || !created.user) {
    const message = createError?.message?.toLowerCase() ?? "";
    if (
      message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists")
    ) {
      return Response.json({ error: "email_taken" }, { status: 409 });
    }
    return Response.json(
      { error: "register_failed", detail: createError?.message },
      { status: 500 },
    );
  }

  const userId = created.user.id;

  const { error: profileError } = await service.from("profiles").insert({
    id: userId,
    role: "volunteer",
    display_name: input.name,
  });

  if (profileError) {
    await service.auth.admin.deleteUser(userId);
    return Response.json(
      { error: "register_failed", detail: profileError.message },
      { status: 500 },
    );
  }

  const { error: volunteerError } = await service.from("volunteers").insert({
    id: userId,
    name: input.name,
    phone: input.phone,
    age: input.age,
    service_areas: input.serviceAreas,
    bio: input.bio,
    approval_status: "pending",
  });

  if (volunteerError) {
    await service.from("profiles").delete().eq("id", userId);
    await service.auth.admin.deleteUser(userId);
    return Response.json(
      { error: "register_failed", detail: volunteerError.message },
      { status: 500 },
    );
  }

  await service.from("activity_logs").insert({
    actor_type: "volunteer",
    actor_id: userId,
    action: VolunteerActivityAction.register,
    target_type: "volunteer",
    target_id: userId,
    metadata: {
      email: input.email,
      approval_status: "pending",
      service_areas: input.serviceAreas,
    },
  });

  return Response.json({
    ok: true,
    userId,
    approvalStatus: "pending",
  });
}
