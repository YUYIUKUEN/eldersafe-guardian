import { ElderActivityAction } from "@eldersafe/shared";
import { endEmergencyForElder } from "@/lib/elder/emergencies";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
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
  try {
    const body = (await request.json()) as { status?: string };
    if (body.status === "cancelled") status = "cancelled";
  } catch {
    // Default resolved ("I am safe").
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
    const message =
      error instanceof Error ? error.message : "emergency_end_failed";
    const notActive = message === "EMERGENCY_NOT_ACTIVE";
    return Response.json(
      { error: notActive ? "not_active" : message },
      { status: notActive ? 409 : 500 },
    );
  }
}
