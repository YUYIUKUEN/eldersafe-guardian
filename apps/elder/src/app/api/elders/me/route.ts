import {
  ElderActivityAction,
  validateElderProfileInput,
} from "@eldersafe/shared";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";
import { toPublicProfile } from "@/lib/elder/types";

export async function GET(request: Request) {
  const store = getElderStore();
  const record = await resolveElderFromRequest(request);
  if (!record) {
    await store.writeActivity({
      actorType: "system",
      action: ElderActivityAction.sessionFail,
      metadata: { reason: "me_unauthorized", storeMode: store.mode },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  await store.writeActivity({
    actorType: "elder",
    actorId: record.id,
    action: ElderActivityAction.profileView,
    targetType: "elder",
    targetId: record.id,
    metadata: { storeMode: store.mode },
  });

  return Response.json({
    elder: toPublicProfile(record),
    storeMode: store.mode,
  });
}

export async function PATCH(request: Request) {
  const store = getElderStore();
  const record = await resolveElderFromRequest(request);
  if (!record) {
    await store.writeActivity({
      actorType: "system",
      action: ElderActivityAction.sessionFail,
      metadata: { reason: "patch_unauthorized", storeMode: store.mode },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const bodyObject =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const language =
    bodyObject.language === "en" || bodyObject.language === "zh-HK"
      ? bodyObject.language
      : record.language;

  const validated = validateElderProfileInput({
    ...bodyObject,
    language,
  });
  if (!validated.value) {
    return Response.json(
      { error: "validation_failed", issues: validated.issues },
      { status: 400 },
    );
  }

  try {
    const updated = await store.updateProfile(record.id, validated.value);
    await store.writeActivity({
      actorType: "elder",
      actorId: record.id,
      action: ElderActivityAction.profileUpdate,
      targetType: "elder",
      targetId: record.id,
      metadata: { storeMode: store.mode },
    });

    return Response.json({
      elder: toPublicProfile(updated),
      storeMode: store.mode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    const status = message === "ELDER_NOT_FOUND" ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
