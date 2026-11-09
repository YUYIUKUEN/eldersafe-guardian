import { ElderActivityAction } from "@eldersafe/shared";
import { getHelpRequestForElder } from "@/lib/elder/help-requests";
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
      metadata: { reason: "help_request_get_unauthorized" },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { record, storeMode } = await getHelpRequestForElder(id, elder.id);
    if (!record) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    await store.writeActivity({
      actorType: "elder",
      actorId: elder.id,
      action: ElderActivityAction.helpRequestView,
      targetType: "help_request",
      targetId: record.id,
      metadata: { storeMode, status: record.status },
    });

    return Response.json({
      helpRequest: {
        id: record.id,
        status: record.status,
        createdAt: record.createdAt,
      },
      storeMode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "help_request_get_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
