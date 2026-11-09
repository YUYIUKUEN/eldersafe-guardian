import { ElderActivityAction } from "@eldersafe/shared";
import { simulateVolunteerTransition } from "@/lib/elder/help-requests";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Memory-store only. Lets local demos advance volunteer accept / mark-done
 * before the volunteer app exists.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const elder = await resolveElderFromRequest(request);
  const store = getElderStore();

  if (!elder) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { action?: string; volunteerName?: string } = {};
  try {
    body = (await request.json()) as {
      action?: string;
      volunteerName?: string;
    };
  } catch {
    body = {};
  }

  const action =
    body.action === "volunteer_complete" ? "volunteer_complete" : "accept";

  try {
    const { record, storeMode } = await simulateVolunteerTransition({
      id,
      elderId: elder.id,
      action,
      volunteerName: body.volunteerName,
    });

    await store.writeActivity({
      actorType: "system",
      actorId: elder.id,
      action: ElderActivityAction.helpRequestView,
      targetType: "help_request",
      targetId: record.id,
      metadata: { storeMode, simulated: action },
    });

    return Response.json({
      helpRequest: {
        id: record.id,
        status: record.status,
        volunteerName: record.volunteerName,
        completedAt: record.completedAt,
        acceptedAt: record.acceptedAt,
      },
      storeMode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "simulate_failed";
    if (message === "SIMULATE_MEMORY_ONLY") {
      return Response.json({ error: "memory_only" }, { status: 400 });
    }
    if (message === "HELP_REQUEST_NOT_FOUND") {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json({ error: message }, { status: 409 });
  }
}
