import { ElderActivityAction } from "@eldersafe/shared";
import { cancelHelpRequestForElder } from "@/lib/elder/help-requests";
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
      metadata: { reason: "help_request_cancel_unauthorized" },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { record, storeMode } = await cancelHelpRequestForElder({
      id,
      elderId: elder.id,
    });

    await store.writeActivity({
      actorType: "elder",
      actorId: elder.id,
      action: ElderActivityAction.helpRequestCancel,
      targetType: "help_request",
      targetId: record.id,
      metadata: { storeMode },
    });

    return Response.json({
      helpRequest: {
        id: record.id,
        status: record.status,
        cancelledAt: record.cancelledAt,
      },
      storeMode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "help_request_cancel_failed";
    const notPending = message === "HELP_REQUEST_NOT_PENDING";
    const notFound = message === "HELP_REQUEST_NOT_FOUND";
    return Response.json(
      { error: notPending ? "not_pending" : notFound ? "not_found" : message },
      { status: notFound ? 404 : notPending ? 409 : 500 },
    );
  }
}
