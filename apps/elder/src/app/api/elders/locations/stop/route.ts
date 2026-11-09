import { ElderActivityAction } from "@eldersafe/shared";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";

export async function POST(request: Request) {
  const elder = await resolveElderFromRequest(request);
  const store = getElderStore();

  if (!elder) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const object =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const helpRequestId =
    typeof object.helpRequestId === "string" ? object.helpRequestId : null;
  const emergencyId =
    typeof object.emergencyId === "string" ? object.emergencyId : null;

  await store.writeActivity({
    actorType: "elder",
    actorId: elder.id,
    action: ElderActivityAction.locationShareStop,
    targetType: helpRequestId ? "help_request" : emergencyId ? "emergency" : null,
    targetId: helpRequestId ?? emergencyId,
    metadata: { reason: "manual_stop" },
  });

  return Response.json({ ok: true });
}
