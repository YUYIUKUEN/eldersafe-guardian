import { ElderActivityAction } from "@eldersafe/shared";
import { createHelpRequest } from "@/lib/elder/help-requests";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
    "application/octet-stream";
  const extensionRaw = form.get("extension");
  const extension =
    typeof extensionRaw === "string" && extensionRaw.trim()
      ? extensionRaw.trim().replace(/^\./, "")
      : "webm";

  const latitude = parseOptionalNumber(form.get("latitude"));
  const longitude = parseOptionalNumber(form.get("longitude"));
  const accuracyM = parseOptionalNumber(form.get("accuracyM"));

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
    const message =
      error instanceof Error ? error.message : "help_request_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
