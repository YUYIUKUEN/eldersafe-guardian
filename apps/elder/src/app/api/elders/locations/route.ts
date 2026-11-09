import { ElderActivityAction } from "@eldersafe/shared";
import { insertLocationPoint } from "@/lib/elder/locations";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(request: Request) {
  const elder = await resolveElderFromRequest(request);
  const store = getElderStore();

  if (!elder) {
    await store.writeActivity({
      actorType: "system",
      action: ElderActivityAction.sessionFail,
      metadata: { reason: "location_unauthorized" },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const object =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const helpRequestId =
    typeof object.helpRequestId === "string" && object.helpRequestId.trim()
      ? object.helpRequestId.trim()
      : null;
  const emergencyId =
    typeof object.emergencyId === "string" && object.emergencyId.trim()
      ? object.emergencyId.trim()
      : null;

  if ((helpRequestId && emergencyId) || (!helpRequestId && !emergencyId)) {
    return Response.json({ error: "invalid_parent" }, { status: 400 });
  }

  const latitude = readNumber(object.latitude);
  const longitude = readNumber(object.longitude);
  const accuracyM = readNumber(object.accuracyM);

  if (latitude == null || longitude == null) {
    return Response.json({ error: "invalid_coordinates" }, { status: 400 });
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return Response.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  try {
    const result = await insertLocationPoint(
      helpRequestId
        ? {
            elderId: elder.id,
            helpRequestId,
            latitude,
            longitude,
            accuracyM,
          }
        : {
            elderId: elder.id,
            emergencyId: emergencyId!,
            latitude,
            longitude,
            accuracyM,
          },
    );

    if (!result.ok) {
      const status =
        result.error === "not_found"
          ? 404
          : result.error === "inactive_parent"
            ? 409
            : 400;
      return Response.json({ error: result.error }, { status });
    }

    if (result.skipped) {
      return Response.json({
        skipped: true,
        retryAfterMs: result.retryAfterMs,
        storeMode: result.storeMode,
      });
    }

    await store.writeActivity({
      actorType: "elder",
      actorId: elder.id,
      action: ElderActivityAction.locationShare,
      targetType: helpRequestId ? "help_request" : "emergency",
      targetId: helpRequestId ?? emergencyId,
      metadata: {
        storeMode: result.storeMode,
        accuracyM,
        locationId: result.record.id,
      },
    });

    return Response.json({
      skipped: false,
      location: {
        id: result.record.id,
        recordedAt: result.record.recordedAt,
      },
      storeMode: result.storeMode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "location_write_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
