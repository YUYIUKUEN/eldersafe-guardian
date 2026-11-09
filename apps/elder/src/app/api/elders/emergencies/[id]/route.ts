import { ElderActivityAction } from "@eldersafe/shared";
import { getEmergencyForElder } from "@/lib/elder/emergencies";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const elder = await resolveElderFromRequest(request);
  const store = getElderStore();

  if (!elder) {
    await store.writeActivity({
      actorType: "system",
      action: ElderActivityAction.sessionFail,
      metadata: { reason: "emergency_view_unauthorized" },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { record, storeMode } = await getEmergencyForElder(id, elder.id);
    if (!record) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    await store.writeActivity({
      actorType: "elder",
      actorId: elder.id,
      action: ElderActivityAction.emergencyView,
      targetType: "emergency",
      targetId: record.id,
      metadata: { storeMode },
    });

    return Response.json({
      emergency: {
        id: record.id,
        status: record.status,
        policeShareToken: record.policeShareToken,
        trackPath: `/track/${record.policeShareToken}`,
        startedAt: record.startedAt,
        endedAt: record.endedAt,
      },
      storeMode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "emergency_view_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
