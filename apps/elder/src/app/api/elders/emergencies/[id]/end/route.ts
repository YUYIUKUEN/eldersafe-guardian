import {
  ElderActivityAction,
  isUuid,
  readJsonBody,
  toSafeErrorCode,
} from "@eldersafe/shared";
import { endEmergencyForElder } from "@/lib/elder/emergencies";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const elder = await resolveElderFromRequest(request);
  const store = getElderStore();

  if (!elder) {
    await store.writeActivity({
      actorType: "system",
      action: ElderActivityAction.sessionFail,
      metadata: { reason: "emergency_end_unauthorized" },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let status: "resolved" | "cancelled" = "resolved";
  const parsed = await readJsonBody<{ status?: string }>(request);
  if (!parsed.ok) {
    if (parsed.error === "body_too_large") {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    // Empty or invalid JSON defaults to resolved ("I am safe").
  } else if (parsed.value.status === "cancelled") {
    status = "cancelled";
  }

  try {
    const { record, storeMode } = await endEmergencyForElder({
      id,
      elderId: elder.id,
      status,
    });

    await store.writeActivity({
      actorType: "elder",
      actorId: elder.id,
      action: ElderActivityAction.emergencyEnd,
      targetType: "emergency",
      targetId: record.id,
      metadata: { storeMode, status },
    });

    return Response.json({
      emergency: {
        id: record.id,
        status: record.status,
        endedAt: record.endedAt,
      },
      storeMode,
    });
  } catch (error) {
    const code = toSafeErrorCode(error, "emergency_end_failed");
    const notActive = code === "EMERGENCY_NOT_ACTIVE";
    return Response.json(
      { error: notActive ? "not_active" : code },
      { status: notActive ? 409 : 500 },
    );
  }
}
