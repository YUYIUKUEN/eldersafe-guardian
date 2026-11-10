import {
  ElderActivityAction,
  clientKeyFromRequest,
  consumeRateLimit,
  getEmergencyDialNumber,
  isEmergencyTestMode,
  toSafeErrorCode,
} from "@eldersafe/shared";
import {
  createEmergency,
  findActiveEmergencyForElder,
} from "@/lib/elder/emergencies";
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

function emergencyJson(record: {
  id: string;
  status: string;
  policeShareToken: string;
  startedAt: string;
  endedAt: string | null;
}) {
  return {
    id: record.id,
    status: record.status,
    policeShareToken: record.policeShareToken,
    trackPath: `/track/${record.policeShareToken}`,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
  };
}

export async function GET(request: Request) {
  const elder = await resolveElderFromRequest(request);
  const store = getElderStore();

  if (!elder) {
    await store.writeActivity({
      actorType: "system",
      action: ElderActivityAction.sessionFail,
      metadata: { reason: "emergency_active_unauthorized" },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { record, storeMode } = await findActiveEmergencyForElder(elder.id);
    const dial = {
      dialNumber: getEmergencyDialNumber(),
      testMode: isEmergencyTestMode(),
    };

    if (!record) {
      return Response.json({ emergency: null, storeMode, ...dial });
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
      emergency: emergencyJson(record),
      storeMode,
      ...dial,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "emergency_lookup_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const elder = await resolveElderFromRequest(request);
  const store = getElderStore();

  if (!elder) {
    await store.writeActivity({
      actorType: "system",
      action: ElderActivityAction.sessionFail,
      metadata: { reason: "emergency_create_unauthorized" },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const limited = consumeRateLimit({
    key: clientKeyFromRequest(request, `elder-emergency:${elder.id}`),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return Response.json(
      { error: "rate_limited", retryAfterMs: limited.retryAfterMs },
      { status: 429 },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const object =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const latitude = readNumber(object.latitude);
  const longitude = readNumber(object.longitude);

  if (
    (latitude != null && (latitude < -90 || latitude > 90)) ||
    (longitude != null && (longitude < -180 || longitude > 180))
  ) {
    return Response.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  try {
    const { record, storeMode } = await createEmergency({
      elderId: elder.id,
      latitude,
      longitude,
      elderSnapshot: {
        name: elder.name,
        age: elder.age,
        address: elder.address,
        healthNotes: elder.healthNotes,
      },
    });

    await store.writeActivity({
      actorType: "elder",
      actorId: elder.id,
      action: ElderActivityAction.emergencyCreate,
      targetType: "emergency",
      targetId: record.id,
      metadata: {
        storeMode,
        hasLocation: latitude != null && longitude != null,
        testMode: isEmergencyTestMode(),
        trackPath: `/track/${record.policeShareToken}`,
      },
    });

    return Response.json({
      emergency: emergencyJson(record),
      dialNumber: getEmergencyDialNumber(),
      testMode: isEmergencyTestMode(),
      storeMode,
    });
  } catch (error) {
    return Response.json(
      { error: toSafeErrorCode(error, "emergency_create_failed") },
      { status: 500 },
    );
  }
}
