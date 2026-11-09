import { randomUUID } from "node:crypto";
import {
  createSupabaseServiceClient,
  tryGetSupabaseAnonConfig,
  tryGetSupabaseServiceRoleKey,
} from "@eldersafe/shared";

export type HelpRequestStatus =
  | "pending"
  | "accepted"
  | "completed"
  | "cancelled";

export type HelpRequestRecord = {
  id: string;
  elderId: string;
  audioPath: string;
  status: HelpRequestStatus;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
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
};

function getMemoryHelpState(): MemoryHelpState {
  const key = "__eldersafe_help_requests_memory__";
  const g = globalThis as typeof globalThis & {
    [key]?: MemoryHelpState;
  };
  if (!g[key]) {
    g[key] = { requests: new Map(), files: new Map() };
  }
  return g[key];
}

function hasSupabaseConfig(): boolean {
  return Boolean(tryGetSupabaseAnonConfig() && tryGetSupabaseServiceRoleKey());
}

export async function createHelpRequest(
  input: CreateHelpRequestInput,
): Promise<{ record: HelpRequestRecord; storeMode: "supabase" | "memory" }> {
  if (hasSupabaseConfig()) {
    return createWithSupabase(input);
  }
  return createWithMemory(input);
}

export async function getHelpRequestForElder(
  id: string,
  elderId: string,
): Promise<{
  record: HelpRequestRecord | null;
  storeMode: "supabase" | "memory";
}> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("help_requests")
      .select("id, elder_id, audio_path, status, latitude, longitude, created_at")
      .eq("id", id)
      .eq("elder_id", elderId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { record: null, storeMode: "supabase" };

    return {
      storeMode: "supabase",
      record: {
        id: data.id as string,
        elderId: data.elder_id as string,
        audioPath: data.audio_path as string,
        status: data.status as HelpRequestStatus,
        latitude: (data.latitude as number | null) ?? null,
        longitude: (data.longitude as number | null) ?? null,
        createdAt: data.created_at as string,
      },
    };
  }

  const state = getMemoryHelpState();
  const record = state.requests.get(id) ?? null;
  if (!record || record.elderId !== elderId) {
    return { record: null, storeMode: "memory" };
  }
  return { record, storeMode: "memory" };
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
  };
  state.requests.set(id, record);
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
    .select("id, elder_id, audio_path, status, latitude, longitude, created_at")
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
    record: {
      id: data.id as string,
      elderId: data.elder_id as string,
      audioPath: data.audio_path as string,
      status: data.status as HelpRequestStatus,
      latitude: (data.latitude as number | null) ?? null,
      longitude: (data.longitude as number | null) ?? null,
      createdAt: data.created_at as string,
    },
  };
}

function guessContentType(extension: string): string {
  if (extension === "m4a" || extension === "mp4") return "audio/mp4";
  if (extension === "ogg") return "audio/ogg";
  return "audio/webm";
}
