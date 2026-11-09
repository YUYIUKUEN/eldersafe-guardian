import { ElderActivityAction } from "@eldersafe/shared";
import { confirmHelpRequestForElder } from "@/lib/elder/help-requests";
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
      metadata: { reason: "help_request_confirm_unauthorized" },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { record, storeMode, points } = await confirmHelpRequestForElder({
      id,
      elderId: elder.id,
    });

    await store.writeActivity({
      actorType: "elder",
      actorId: elder.id,
      action: ElderActivityAction.helpRequestConfirm,
      targetType: "help_request",
      targetId: record.id,
      metadata: {
        storeMode,
        pointsDeferred: points.deferred,
        volunteerId: record.volunteerId,
      },
    });

    return Response.json({
      helpRequest: {
        id: record.id,
        status: record.status,
        elderConfirmedAt: record.elderConfirmedAt,
        volunteerName: record.volunteerName,
      },
      points,
      storeMode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "help_request_confirm_failed";
    const notConfirmable = message === "HELP_REQUEST_NOT_CONFIRMABLE";
    const notFound = message === "HELP_REQUEST_NOT_FOUND";
    return Response.json(
      {
        error: notConfirmable
          ? "not_confirmable"
          : notFound
            ? "not_found"
            : message,
      },
      { status: notFound ? 404 : notConfirmable ? 409 : 500 },
    );
  }
}
