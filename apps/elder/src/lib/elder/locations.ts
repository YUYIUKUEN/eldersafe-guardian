import {
  createSupabaseServiceClient,
  tryGetSupabaseAnonConfig,
  tryGetSupabaseServiceRoleKey,
} from "@eldersafe/shared";
import { getHelpRequestForElder } from "./help-requests";
import { isMemoryEmergencyActiveForElder } from "./emergencies";
import { LOCATION_WRITE_INTERVAL_MS } from "./location-constants";

export { LOCATION_WRITE_INTERVAL_MS } from "./location-constants";

export type LocationParent =
  | { helpRequestId: string; emergencyId?: undefined }
  | { emergencyId: string; helpRequestId?: undefined };

export type LocationPointInput = LocationParent & {
  elderId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
};

export type LocationPointRecord = {
  id: string;
  elderId: string;
  helpRequestId: string | null;
  emergencyId: string | null;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  recordedAt: string;
};

type MemoryLocationState = {
  points: LocationPointRecord[];
  nextId: number;
  /** Parent key → last successful write epoch ms (throttle). */
  lastWriteAt: Map<string, number>;
};

function getMemoryLocationState(): MemoryLocationState {
  const key = "__eldersafe_locations_memory__";
  const g = globalThis as typeof globalThis & {
    [key]?: MemoryLocationState;
  };
  if (!g[key]) {
    g[key] = { points: [], nextId: 1, lastWriteAt: new Map() };
  }
  return g[key];
}

function hasSupabaseConfig(): boolean {
  return Boolean(tryGetSupabaseAnonConfig() && tryGetSupabaseServiceRoleKey());
}

function parentKey(input: LocationParent): string {
  if (input.helpRequestId) return `help:${input.helpRequestId}`;
  return `emergency:${input.emergencyId}`;
}

export type InsertLocationResult =
  | { ok: true; skipped: false; record: LocationPointRecord; storeMode: "supabase" | "memory" }
  | { ok: true; skipped: true; storeMode: "supabase" | "memory"; retryAfterMs: number }
  | { ok: false; error: "inactive_parent" | "not_found" | "invalid_parent" };

export async function insertLocationPoint(
  input: LocationPointInput,
): Promise<InsertLocationResult> {
  if (!input.helpRequestId && !input.emergencyId) {
    return { ok: false, error: "invalid_parent" };
  }
  if (input.helpRequestId && input.emergencyId) {
    return { ok: false, error: "invalid_parent" };
  }

  const active = await assertParentActive(input);
  if (!active.ok) return active;

  if (hasSupabaseConfig()) {
    return insertWithSupabase(input);
  }
  return insertWithMemory(input);
}

async function assertParentActive(
  input: LocationPointInput,
): Promise<
  | { ok: true }
  | { ok: false; error: "inactive_parent" | "not_found" | "invalid_parent" }
> {
  if (input.helpRequestId) {
    const { record } = await getHelpRequestForElder(
      input.helpRequestId,
      input.elderId,
    );
    if (!record) return { ok: false, error: "not_found" };
    if (record.status === "completed" || record.status === "cancelled") {
      return { ok: false, error: "inactive_parent" };
    }
    return { ok: true };
  }

  if (!hasSupabaseConfig()) {
    if (
      isMemoryEmergencyActiveForElder(input.elderId, input.emergencyId!)
    ) {
      return { ok: true };
    }
    return { ok: false, error: "not_found" };
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("emergencies")
    .select("id, elder_id, status")
    .eq("id", input.emergencyId!)
    .eq("elder_id", input.elderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return { ok: false, error: "not_found" };
  if (data.status !== "active") return { ok: false, error: "inactive_parent" };
  return { ok: true };
}

export function getMemoryLocationsForEmergency(
  emergencyId: string,
): Array<{
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  recordedAt: string;
}> {
  const state = getMemoryLocationState();
  return state.points
    .filter((point) => point.emergencyId === emergencyId)
    .map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      accuracyM: point.accuracyM,
      recordedAt: point.recordedAt,
    }));
}

async function insertWithMemory(
  input: LocationPointInput,
): Promise<InsertLocationResult> {
  const state = getMemoryLocationState();
  const key = parentKey(input);
  const now = Date.now();
  const last = state.lastWriteAt.get(key) ?? 0;
  const elapsed = now - last;
  if (elapsed < LOCATION_WRITE_INTERVAL_MS) {
    return {
      ok: true,
      skipped: true,
      storeMode: "memory",
      retryAfterMs: LOCATION_WRITE_INTERVAL_MS - elapsed,
    };
  }

  const record: LocationPointRecord = {
    id: String(state.nextId++),
    elderId: input.elderId,
    helpRequestId: input.helpRequestId ?? null,
    emergencyId: input.emergencyId ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyM: input.accuracyM,
    recordedAt: new Date(now).toISOString(),
  };
  state.points.push(record);
  state.lastWriteAt.set(key, now);
  return { ok: true, skipped: false, record, storeMode: "memory" };
}

async function insertWithSupabase(
  input: LocationPointInput,
): Promise<InsertLocationResult> {
  const supabase = createSupabaseServiceClient();
  const filterColumn = input.helpRequestId ? "help_request_id" : "emergency_id";
  const filterValue = input.helpRequestId ?? input.emergencyId!;

  const { data: latest, error: latestError } = await supabase
    .from("locations")
    .select("recorded_at")
    .eq(filterColumn, filterValue)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw new Error(latestError.message);

  if (latest?.recorded_at) {
    const lastMs = Date.parse(latest.recorded_at as string);
    const elapsed = Date.now() - lastMs;
    if (Number.isFinite(lastMs) && elapsed < LOCATION_WRITE_INTERVAL_MS) {
      return {
        ok: true,
        skipped: true,
        storeMode: "supabase",
        retryAfterMs: LOCATION_WRITE_INTERVAL_MS - elapsed,
      };
    }
  }

  const { data, error } = await supabase
    .from("locations")
    .insert({
      elder_id: input.elderId,
      help_request_id: input.helpRequestId ?? null,
      emergency_id: input.emergencyId ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_m: input.accuracyM,
    })
    .select(
      "id, elder_id, help_request_id, emergency_id, latitude, longitude, accuracy_m, recorded_at",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "LOCATION_INSERT_FAILED");
  }

  return {
    ok: true,
    skipped: false,
    storeMode: "supabase",
    record: {
      id: String(data.id),
      elderId: data.elder_id as string,
      helpRequestId: (data.help_request_id as string | null) ?? null,
      emergencyId: (data.emergency_id as string | null) ?? null,
      latitude: data.latitude as number,
      longitude: data.longitude as number,
      accuracyM: (data.accuracy_m as number | null) ?? null,
      recordedAt: data.recorded_at as string,
    },
  };
}
