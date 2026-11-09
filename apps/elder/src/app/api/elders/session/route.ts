import { ElderActivityAction, hashDeviceKey } from "@eldersafe/shared";
import { getElderStore } from "@/lib/elder/store";
import { toPublicProfile } from "@/lib/elder/types";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const deviceKey =
    typeof body === "object" &&
    body &&
    "deviceKey" in body &&
    typeof (body as { deviceKey: unknown }).deviceKey === "string"
      ? (body as { deviceKey: string }).deviceKey.trim()
      : "";

  if (!deviceKey) {
    return Response.json({ error: "missing_device_key" }, { status: 400 });
  }

  const store = getElderStore();
  const hash = hashDeviceKey(deviceKey);

  try {
    const record = await store.findByDeviceKeyHash(hash);
    if (!record) {
      await store.writeActivity({
        actorType: "system",
        action: ElderActivityAction.sessionFail,
        metadata: { reason: "unknown_or_disabled", storeMode: store.mode },
      });
      return Response.json({ error: "invalid_device_key" }, { status: 401 });
    }

    await store.writeActivity({
      actorType: "elder",
      actorId: record.id,
      action: ElderActivityAction.sessionOk,
      targetType: "elder",
      targetId: record.id,
      metadata: { storeMode: store.mode },
    });

    return Response.json({
      elder: toPublicProfile(record),
      storeMode: store.mode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "session_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
