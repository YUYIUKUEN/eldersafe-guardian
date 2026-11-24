import { randomUUID } from "node:crypto";
import {
  canAccessVolunteerApp,
  createSupabaseServiceClient,
  loadAccessContext,
  VolunteerActivityAction,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

const PROOF_BUCKET = "completion-proofs";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return Response.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const access = await loadAccessContext(supabase, user.id);
  if (!canAccessVolunteerApp(access)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid_form" }, { status: 400 });
  }

  const notesRaw = form.get("notes");
  const notes =
    typeof notesRaw === "string" ? notesRaw.trim() : "";
  if (notes.length < 2) {
    return Response.json({ error: "notes_required" }, { status: 400 });
  }
  if (notes.length > 500) {
    return Response.json({ error: "notes_too_long" }, { status: 400 });
  }

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size <= 0) {
    return Response.json({ error: "photo_required" }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return Response.json({ error: "photo_too_large" }, { status: 400 });
  }

  const mimeType = (photo.type || "").toLowerCase();
  if (!ALLOWED_PHOTO_TYPES.has(mimeType)) {
    return Response.json({ error: "invalid_photo_type" }, { status: 400 });
  }

  let service;
  try {
    service = createSupabaseServiceClient();
  } catch {
    return Response.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const objectPath = `${user.id}/${id}/${randomUUID()}.${extensionForMime(mimeType)}`;
  const bytes = new Uint8Array(await photo.arrayBuffer());
  const { error: uploadError } = await service.storage
    .from(PROOF_BUCKET)
    .upload(objectPath, bytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return Response.json(
      { error: "photo_upload_failed", detail: uploadError.message },
      { status: 500 },
    );
  }

  const { data, error } = await supabase.rpc("complete_help_request", {
    target_id: id,
    p_notes: notes,
    p_photo_path: objectPath,
  });

  if (error) {
    // Best-effort cleanup so failed completes do not leave orphan objects.
    await service.storage.from(PROOF_BUCKET).remove([objectPath]);
    const message = error.message ?? "";
    if (message.includes("completion_notes_required")) {
      return Response.json({ error: "notes_required" }, { status: 400 });
    }
    if (message.includes("completion_photo_required")) {
      return Response.json({ error: "photo_required" }, { status: 400 });
    }
    return Response.json(
      { error: "complete_failed", detail: error.message },
      { status: 500 },
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    await service.storage.from(PROOF_BUCKET).remove([objectPath]);
    return Response.json({ error: "not_completable" }, { status: 409 });
  }

  await supabase.from("activity_logs").insert({
    actor_type: "volunteer",
    actor_id: user.id,
    action: VolunteerActivityAction.complete,
    target_type: "help_request",
    target_id: row.id,
    metadata: {
      elder_id: row.elder_id,
      completed_at: row.completed_at,
      awaiting_elder_confirm: true,
      points_deferred: true,
      notify_elder: true,
      has_photo: true,
      notes_length: notes.length,
      completion_photo_path: objectPath,
    },
  });

  return Response.json({
    ok: true,
    id: row.id,
    status: row.status,
    completedAt: row.completed_at,
    completionNotes: row.completion_notes ?? notes,
    completionPhotoPath: row.completion_photo_path ?? objectPath,
    awaitingElderConfirm: true,
  });
}
