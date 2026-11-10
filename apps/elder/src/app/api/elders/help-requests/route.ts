import {
  ElderActivityAction,
  clientKeyFromRequest,
  consumeRateLimit,
  toSafeErrorCode,
} from "@eldersafe/shared";
import {
  createHelpRequest,
  listHelpRequestsForElder,
} from "@/lib/elder/help-requests";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";

const ALLOWED_EXTENSIONS = new Set(["webm", "ogg", "mp4", "m4a", "wav"]);
const ALLOWED_MIME_PREFIXES = ["audio/", "video/webm", "video/mp4"];

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeExtension(raw: string): string | null {
  const cleaned = raw.trim().replace(/^\./, "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(cleaned)) return null;
  return cleaned;
}

function isAllowedMime(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase();
  if (!normalized) return false;
  return ALLOWED_MIME_PREFIXES.some(
    (prefix) =>
      normalized === prefix ||
      normalized.startsWith(prefix.endsWith("/") ? prefix : `${prefix};`),
  );
}

export async function GET(request: Request) {
  const elder = await resolveElderFromRequest(request);
  const store = getElderStore();

  if (!elder) {
    await store.writeActivity({
      actorType: "system",
      action: ElderActivityAction.sessionFail,
      metadata: { reason: "help_request_list_unauthorized" },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { items, storeMode } = await listHelpRequestsForElder(elder.id);

    await store.writeActivity({
      actorType: "elder",
      actorId: elder.id,
      action: ElderActivityAction.helpRequestList,
      targetType: "help_request",
      metadata: { storeMode, count: items.length },
    });

    return Response.json({
      helpRequests: items,
      elderId: elder.id,
      storeMode,
    });
  } catch (error) {
    return Response.json(
      { error: toSafeErrorCode(error, "help_request_list_failed") },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const elder = await resolveElderFromRequest(request);
  const store = getElderStore();

  if (!elder) {
    await store.writeActivity({
      actorType: "system",
      action: ElderActivityAction.sessionFail,
      metadata: { reason: "help_request_unauthorized" },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const limited = consumeRateLimit({
    key: clientKeyFromRequest(request, `elder-help:${elder.id}`),
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return Response.json(
      { error: "rate_limited", retryAfterMs: limited.retryAfterMs },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid_form" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size <= 0) {
    return Response.json({ error: "missing_audio" }, { status: 400 });
  }

  // Keep recordings bounded for elder phones / storage.
  const maxBytes = 8 * 1024 * 1024;
  if (audio.size > maxBytes) {
    return Response.json({ error: "audio_too_large" }, { status: 400 });
  }

  const mimeType =
    (typeof form.get("mimeType") === "string" && String(form.get("mimeType"))) ||
    audio.type ||
    "audio/webm";
  if (!isAllowedMime(mimeType)) {
    return Response.json({ error: "invalid_audio_type" }, { status: 400 });
  }

  const extensionRaw = form.get("extension");
  const extension =
    typeof extensionRaw === "string" && extensionRaw.trim()
      ? normalizeExtension(extensionRaw)
      : "webm";
  if (!extension) {
    return Response.json({ error: "invalid_audio_extension" }, { status: 400 });
  }

  const latitude = parseOptionalNumber(form.get("latitude"));
  const longitude = parseOptionalNumber(form.get("longitude"));
  const accuracyM = parseOptionalNumber(form.get("accuracyM"));

  if (
    (latitude != null && (latitude < -90 || latitude > 90)) ||
    (longitude != null && (longitude < -180 || longitude > 180))
  ) {
    return Response.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const { record, storeMode } = await createHelpRequest({
      elderId: elder.id,
      audioBytes: bytes,
      mimeType,
      extension,
      latitude,
      longitude,
      accuracyM,
    });

    await store.writeActivity({
      actorType: "elder",
      actorId: elder.id,
      action: ElderActivityAction.helpRequestCreate,
      targetType: "help_request",
      targetId: record.id,
      metadata: {
        storeMode,
        audioPath: record.audioPath,
        hasLocation: latitude != null && longitude != null,
        mimeType,
      },
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
    return Response.json(
      { error: toSafeErrorCode(error, "help_request_failed") },
      { status: 500 },
    );
  }
}
