import {
  ElderActivityAction,
  isUuid,
  readJsonBody,
  toSafeErrorCode,
} from "@eldersafe/shared";
import { simulateVolunteerTransition } from "@/lib/elder/help-requests";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Memory-store only + non-production. Lets local demos advance volunteer
 * accept / mark-done without the volunteer app.
 */
export async function POST(request: Request, context: RouteContext) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const elder = await resolveElderFromRequest(request);
  const store = getElderStore();

  if (!elder) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { action?: string; volunteerName?: string } = {};
  const parsed = await readJsonBody<{
    action?: string;
    volunteerName?: string;
  }>(request);
  if (!parsed.ok) {
    if (parsed.error === "body_too_large") {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
  } else {
    body = parsed.value;
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
    const code = toSafeErrorCode(error, "simulate_failed");
    if (code === "SIMULATE_MEMORY_ONLY") {
      return Response.json({ error: "memory_only" }, { status: 400 });
    }
    if (code === "HELP_REQUEST_NOT_FOUND") {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json({ error: "simulate_conflict" }, { status: 409 });
  }
}
