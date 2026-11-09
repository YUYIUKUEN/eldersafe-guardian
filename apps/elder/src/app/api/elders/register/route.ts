import {
  ELDER_CONSENT_VERSION,
  ElderActivityAction,
  generateDeviceKey,
  hashDeviceKey,
  validateElderRegisterPayload,
} from "@eldersafe/shared";
import { getElderStore } from "@/lib/elder/store";
import { toPublicProfile } from "@/lib/elder/types";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const validated = validateElderRegisterPayload(
    (body ?? {}) as Record<string, unknown>,
  );
  if (!validated.value) {
    return Response.json(
      { error: "validation_failed", issues: validated.issues },
      { status: 400 },
    );
  }

  const store = getElderStore();
  const deviceKey = generateDeviceKey();
  const deviceKeyHash = hashDeviceKey(deviceKey);

  try {
    const record = await store.register(
      validated.value,
      deviceKeyHash,
      ELDER_CONSENT_VERSION,
    );

    await store.writeActivity({
      actorType: "elder",
      actorId: record.id,
      action: ElderActivityAction.register,
      targetType: "elder",
      targetId: record.id,
      metadata: {
        consentVersion: ELDER_CONSENT_VERSION,
        storeMode: store.mode,
        language: record.language,
      },
    });

    return Response.json({
      deviceKey,
      elder: toPublicProfile(record),
      storeMode: store.mode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "register_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
