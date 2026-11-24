import {
  ElderActivityAction,
  clientKeyFromRequest,
  consumeRateLimit,
  toSafeErrorCode,
  type HelpMeetingType,
} from "@eldersafe/shared";
import {
  createHelpRequest,
  listHelpRequestsForElder,
} from "@/lib/elder/help-requests";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";

const ALLOWED_EXTENSIONS = new Set(["webm", "ogg", "mp4", "m4a", "wav"]);
const ALLOWED_MIME_PREFIXES = ["audio/", "video/webm", "video/mp4"];

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

function parseMeetingType(value: FormDataEntryValue | null): HelpMeetingType | null {
  if (value === "home" || value === "custom") return value;
  return null;
}

function resolveMeetingPlace(
  meetingType: HelpMeetingType,
  elder: { address: string; meetingPlace: string | null },
): string {
  if (meetingType === "custom" && elder.meetingPlace?.trim()) {
    return elder.meetingPlace.trim();
  }
  // Home, or custom with no saved place — fall back to registration address.
  return elder.address;
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

  const meetingType = parseMeetingType(form.get("meetingType"));
  if (!meetingType) {
    return Response.json({ error: "invalid_meeting_type" }, { status: 400 });
  }

  const meetingPlace = resolveMeetingPlace(meetingType, elder);

  try {
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const { record, storeMode } = await createHelpRequest({
      elderId: elder.id,
      audioBytes: bytes,
      mimeType,
      extension,
      meetingType,
      meetingPlace,
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
        meetingType,
        meetingPlace,
        mimeType,
      },
    });

    return Response.json({
      helpRequest: {
        id: record.id,
        status: record.status,
        createdAt: record.createdAt,
        meetingType: record.meetingType,
        meetingPlace: record.meetingPlace,
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
