import { randomUUID } from "node:crypto";
import {
  awardPointsForConfirmedHelpRequest,
  createSupabaseServiceClient,
  tryGetSupabaseAnonConfig,
  tryGetSupabaseServiceRoleKey,
} from "@eldersafe/shared";
import type {
  HelpRequestListItem,
  HelpRequestStatus,
} from "./help-request-types";

export type { HelpRequestListItem, HelpRequestStatus } from "./help-request-types";

export type HelpRequestRecord = {
  id: string;
  elderId: string;
  audioPath: string;
  status: HelpRequestStatus;
  latitude: number | null;
  longitude: number | null;
  volunteerId: string | null;
  volunteerName: string | null;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  elderConfirmedAt: string | null;
};

export type CreateHelpRequestInput = {
  elderId: string;
  audioBytes: Uint8Array;
  mimeType: string;
  extension: string;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
};

const VOICE_BUCKET = "voice-recordings";

type MemoryHelpState = {
  requests: Map<string, HelpRequestRecord>;
  files: Map<string, Uint8Array>;
  listeners: Set<() => void>;
};

function getMemoryHelpState(): MemoryHelpState {
  const key = "__eldersafe_help_requests_memory__";
  const g = globalThis as typeof globalThis & {
    [key]?: MemoryHelpState;
  };
  if (!g[key]) {
    g[key] = {
      requests: new Map(),
      files: new Map(),
      listeners: new Set(),
    };
  }
  return g[key];
}

function notifyMemoryListeners() {
  const state = getMemoryHelpState();
  for (const listener of state.listeners) {
    try {
      listener();
    } catch {
      // Ignore listener errors.
    }
  }
}

/** Memory-mode pub/sub used by the live stream when Supabase is offline. */
export function subscribeMemoryHelpRequests(listener: () => void): () => void {
  const state = getMemoryHelpState();
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}

function hasSupabaseConfig(): boolean {
  return Boolean(tryGetSupabaseAnonConfig() && tryGetSupabaseServiceRoleKey());
}

function toListItem(record: HelpRequestRecord): HelpRequestListItem {
  const awaitingElderConfirm =
    record.status === "accepted" &&
    record.completedAt != null &&
    record.elderConfirmedAt == null;
  return {
    id: record.id,
    status: record.status,
    volunteerName: record.volunteerName,
    createdAt: record.createdAt,
    acceptedAt: record.acceptedAt,
    completedAt: record.completedAt,
    cancelledAt: record.cancelledAt,
    elderConfirmedAt: record.elderConfirmedAt,
    awaitingElderConfirm,
    canCancel: record.status === "pending",
    canConfirm: awaitingElderConfirm,
  };
}

export async function createHelpRequest(
  input: CreateHelpRequestInput,
): Promise<{ record: HelpRequestRecord; storeMode: "supabase" | "memory" }> {
  if (hasSupabaseConfig()) {
    return createWithSupabase(input);
  }
  return createWithMemory(input);
}

export async function listHelpRequestsForElder(
  elderId: string,
): Promise<{
  items: HelpRequestListItem[];
  storeMode: "supabase" | "memory";
}> {
  if (hasSupabaseConfig()) {
    const records = await listWithSupabase(elderId);
    return {
      storeMode: "supabase",
      items: records.map(toListItem),
    };
  }
  const state = getMemoryHelpState();
  const records = [...state.requests.values()]
    .filter((record) => record.elderId === elderId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { storeMode: "memory", items: records.map(toListItem) };
}

export async function getHelpRequestForElder(
  id: string,
  elderId: string,
): Promise<{
  record: HelpRequestRecord | null;
  storeMode: "supabase" | "memory";
}> {
  if (hasSupabaseConfig()) {
    const record = await getOneWithSupabase(id, elderId);
    return { record, storeMode: "supabase" };
  }

  const state = getMemoryHelpState();
  const record = state.requests.get(id) ?? null;
  if (!record || record.elderId !== elderId) {
    return { record: null, storeMode: "memory" };
  }
  return { record, storeMode: "memory" };
}

export async function cancelHelpRequestForElder(input: {
  id: string;
  elderId: string;
}): Promise<{ record: HelpRequestRecord; storeMode: "supabase" | "memory" }> {
  if (hasSupabaseConfig()) {
    return cancelWithSupabase(input);
  }
  return cancelWithMemory(input);
}

export async function confirmHelpRequestForElder(input: {
  id: string;
  elderId: string;
}): Promise<{
  record: HelpRequestRecord;
  storeMode: "supabase" | "memory";
  points: Awaited<ReturnType<typeof awardPointsForConfirmedHelpRequest>>;
}> {
  if (hasSupabaseConfig()) {
    return confirmWithSupabase(input);
  }
  return confirmWithMemory(input);
}

/**
 * Memory-mode helper so local demos can advance volunteer status
 * before the volunteer app exists.
 */
export async function simulateVolunteerTransition(input: {
  id: string;
  elderId: string;
  action: "accept" | "volunteer_complete";
  volunteerName?: string;
}): Promise<{ record: HelpRequestRecord; storeMode: "memory" }> {
  if (hasSupabaseConfig()) {
    throw new Error("SIMULATE_MEMORY_ONLY");
  }
  const state = getMemoryHelpState();
  const current = state.requests.get(input.id);
  if (!current || current.elderId !== input.elderId) {
    throw new Error("HELP_REQUEST_NOT_FOUND");
  }

  const now = new Date().toISOString();
  let next: HelpRequestRecord;
  if (input.action === "accept") {
    if (current.status !== "pending") {
      throw new Error("HELP_REQUEST_NOT_PENDING");
    }
    next = {
      ...current,
      status: "accepted",
      volunteerId: current.volunteerId ?? randomUUID(),
      volunteerName: input.volunteerName?.trim() || "測試義工",
      acceptedAt: now,
    };
  } else {
    if (current.status !== "accepted") {
      throw new Error("HELP_REQUEST_NOT_ACCEPTED");
    }
    next = {
      ...current,
      completedAt: now,
      volunteerName:
        input.volunteerName?.trim() || current.volunteerName || "測試義工",
    };
  }

  state.requests.set(input.id, next);
  notifyMemoryListeners();
  return { record: next, storeMode: "memory" };
}

function emptyTimestamps(): Pick<
  HelpRequestRecord,
  | "volunteerId"
  | "volunteerName"
  | "acceptedAt"
  | "completedAt"
  | "cancelledAt"
  | "elderConfirmedAt"
> {
  return {
    volunteerId: null,
    volunteerName: null,
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null,
    elderConfirmedAt: null,
  };
}

async function createWithMemory(
  input: CreateHelpRequestInput,
): Promise<{ record: HelpRequestRecord; storeMode: "memory" }> {
  const state = getMemoryHelpState();
  const id = randomUUID();
  const audioPath = `memory/${input.elderId}/${id}.${input.extension}`;
  state.files.set(audioPath, input.audioBytes);

  const record: HelpRequestRecord = {
    id,
    elderId: input.elderId,
    audioPath,
    status: "pending",
    latitude: input.latitude,
    longitude: input.longitude,
    createdAt: new Date().toISOString(),
    ...emptyTimestamps(),
  };
  state.requests.set(id, record);
  notifyMemoryListeners();
  return { record, storeMode: "memory" };
}

async function createWithSupabase(
  input: CreateHelpRequestInput,
): Promise<{ record: HelpRequestRecord; storeMode: "supabase" }> {
  const supabase = createSupabaseServiceClient();
  const objectPath = `${input.elderId}/${randomUUID()}.${input.extension}`;
  const contentType = input.mimeType || guessContentType(input.extension);

  const { error: uploadError } = await supabase.storage
    .from(VOICE_BUCKET)
    .upload(objectPath, input.audioBytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const audioPath = `${VOICE_BUCKET}/${objectPath}`;

  const { data, error } = await supabase
    .from("help_requests")
    .insert({
      elder_id: input.elderId,
      audio_path: audioPath,
      status: "pending",
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select(
      "id, elder_id, audio_path, status, latitude, longitude, volunteer_id, created_at, accepted_at, completed_at, cancelled_at, elder_confirmed_at",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "HELP_REQUEST_INSERT_FAILED");
  }

  if (input.latitude != null && input.longitude != null) {
    const { error: locationError } = await supabase.from("locations").insert({
      elder_id: input.elderId,
      help_request_id: data.id,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_m: input.accuracyM,
    });
    if (locationError) {
      throw new Error(locationError.message);
    }
  }

  return {
    storeMode: "supabase",
    record: mapRow(data, null),
  };
}

async function listWithSupabase(elderId: string): Promise<HelpRequestRecord[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("help_requests")
    .select(
      "id, elder_id, audio_path, status, latitude, longitude, volunteer_id, created_at, accepted_at, completed_at, cancelled_at, elder_confirmed_at, volunteers(name)",
    )
    .eq("elder_id", elderId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const volunteer = row.volunteers as { name?: string } | null;
    return mapRow(row, volunteer?.name ?? null);
  });
}

async function getOneWithSupabase(
  id: string,
  elderId: string,
): Promise<HelpRequestRecord | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("help_requests")
    .select(
      "id, elder_id, audio_path, status, latitude, longitude, volunteer_id, created_at, accepted_at, completed_at, cancelled_at, elder_confirmed_at, volunteers(name)",
    )
    .eq("id", id)
    .eq("elder_id", elderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const volunteer = data.volunteers as { name?: string } | null;
  return mapRow(data, volunteer?.name ?? null);
}

async function cancelWithMemory(input: {
  id: string;
  elderId: string;
}): Promise<{ record: HelpRequestRecord; storeMode: "memory" }> {
  const state = getMemoryHelpState();
  const current = state.requests.get(input.id);
  if (!current || current.elderId !== input.elderId) {
    throw new Error("HELP_REQUEST_NOT_FOUND");
  }
  if (current.status !== "pending") {
    throw new Error("HELP_REQUEST_NOT_PENDING");
  }
  const next: HelpRequestRecord = {
    ...current,
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
  };
  state.requests.set(input.id, next);
  notifyMemoryListeners();
  return { record: next, storeMode: "memory" };
}

async function cancelWithSupabase(input: {
  id: string;
  elderId: string;
}): Promise<{ record: HelpRequestRecord; storeMode: "supabase" }> {
  const supabase = createSupabaseServiceClient();
  const cancelledAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("help_requests")
    .update({ status: "cancelled", cancelled_at: cancelledAt })
    .eq("id", input.id)
    .eq("elder_id", input.elderId)
    .eq("status", "pending")
    .select(
      "id, elder_id, audio_path, status, latitude, longitude, volunteer_id, created_at, accepted_at, completed_at, cancelled_at, elder_confirmed_at",
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("HELP_REQUEST_NOT_PENDING");
  return { record: mapRow(data, null), storeMode: "supabase" };
}

async function confirmWithMemory(input: {
  id: string;
  elderId: string;
}): Promise<{
  record: HelpRequestRecord;
  storeMode: "memory";
  points: Awaited<ReturnType<typeof awardPointsForConfirmedHelpRequest>>;
}> {
  const state = getMemoryHelpState();
  const current = state.requests.get(input.id);
  if (!current || current.elderId !== input.elderId) {
    throw new Error("HELP_REQUEST_NOT_FOUND");
  }
  if (
    current.status !== "accepted" ||
    current.completedAt == null ||
    current.elderConfirmedAt != null
  ) {
    throw new Error("HELP_REQUEST_NOT_CONFIRMABLE");
  }
  if (!current.volunteerId) {
    throw new Error("HELP_REQUEST_MISSING_VOLUNTEER");
  }

  const now = new Date().toISOString();
  const next: HelpRequestRecord = {
    ...current,
    status: "completed",
    elderConfirmedAt: now,
  };
  state.requests.set(input.id, next);

  const points = await awardPointsForConfirmedHelpRequest({
    helpRequestId: next.id,
    volunteerId: current.volunteerId,
    elderId: input.elderId,
  });
  notifyMemoryListeners();
  return { record: next, storeMode: "memory", points };
}

async function confirmWithSupabase(input: {
  id: string;
  elderId: string;
}): Promise<{
  record: HelpRequestRecord;
  storeMode: "supabase";
  points: Awaited<ReturnType<typeof awardPointsForConfirmedHelpRequest>>;
}> {
  const supabase = createSupabaseServiceClient();
  const existing = await getOneWithSupabase(input.id, input.elderId);
  if (!existing) throw new Error("HELP_REQUEST_NOT_FOUND");
  if (
    existing.status !== "accepted" ||
    existing.completedAt == null ||
    existing.elderConfirmedAt != null ||
    !existing.volunteerId
  ) {
    throw new Error("HELP_REQUEST_NOT_CONFIRMABLE");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("help_requests")
    .update({
      status: "completed",
      elder_confirmed_at: now,
    })
    .eq("id", input.id)
    .eq("elder_id", input.elderId)
    .eq("status", "accepted")
    .is("elder_confirmed_at", null)
    .not("completed_at", "is", null)
    .select(
      "id, elder_id, audio_path, status, latitude, longitude, volunteer_id, created_at, accepted_at, completed_at, cancelled_at, elder_confirmed_at",
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("HELP_REQUEST_NOT_CONFIRMABLE");

  const points = await awardPointsForConfirmedHelpRequest({
    helpRequestId: data.id as string,
    volunteerId: existing.volunteerId,
    elderId: input.elderId,
  });

  return {
    record: mapRow(data, existing.volunteerName),
    storeMode: "supabase",
    points,
  };
}

function mapRow(
  row: Record<string, unknown>,
  volunteerName: string | null,
): HelpRequestRecord {
  return {
    id: row.id as string,
    elderId: row.elder_id as string,
    audioPath: row.audio_path as string,
    status: row.status as HelpRequestStatus,
    latitude: (row.latitude as number | null) ?? null,
    longitude: (row.longitude as number | null) ?? null,
    volunteerId: (row.volunteer_id as string | null) ?? null,
    volunteerName,
    createdAt: row.created_at as string,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    cancelledAt: (row.cancelled_at as string | null) ?? null,
    elderConfirmedAt: (row.elder_confirmed_at as string | null) ?? null,
  };
}

function guessContentType(extension: string): string {
  if (extension === "m4a" || extension === "mp4") return "audio/mp4";
  if (extension === "ogg") return "audio/ogg";
  return "audio/webm";
}
