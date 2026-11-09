import { ElderActivityAction } from "@eldersafe/shared";
import { getPublicTrackByToken } from "@/lib/elder/emergencies";
import { getElderStore } from "@/lib/elder/store";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const store = getElderStore();

  if (!token || token.length < 16) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const { payload, storeMode } = await getPublicTrackByToken(token);
    if (!payload) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    await store.writeActivity({
      actorType: "system",
      action: ElderActivityAction.emergencyTrackView,
      targetType: "emergency",
      targetId: payload.emergency.id,
      metadata: {
        storeMode,
        status: payload.emergency.status,
        locationCount: payload.locations.length,
      },
    });

    return Response.json({
      emergency: payload.emergency,
      elder: payload.elder,
      locations: payload.locations,
      storeMode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "track_lookup_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
