import { randomBytes, randomUUID } from "node:crypto";
import {
  createSupabaseServiceClient,
  tryGetSupabaseAnonConfig,
  tryGetSupabaseServiceRoleKey,
} from "@eldersafe/shared";

export type EmergencyStatus = "active" | "resolved" | "cancelled";

export type EmergencyElderSnapshot = {
  name: string;
  age: number;
  address: string;
  healthNotes: string | null;
};

export type EmergencyRecord = {
  id: string;
  elderId: string;
  status: EmergencyStatus;
  policeShareToken: string;
  latitude: number | null;
  longitude: number | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  /** Memory-mode only: safe fields for public /track page. */
  elderSnapshot?: EmergencyElderSnapshot;
};

export type PublicTrackPayload = {
  emergency: {
    id: string;
    status: EmergencyStatus;
    startedAt: string;
  };
  elder: {
    name: string;
    age: number;
    address: string;
    healthNotes: string | null;
  };
  locations: Array<{
    latitude: number;
    longitude: number;
    accuracyM: number | null;
    recordedAt: string;
  }>;
};

type MemoryEmergencyState = {
  byId: Map<string, EmergencyRecord>;
  byToken: Map<string, string>;
  byElderActive: Map<string, string>;
};

function getMemoryEmergencyState(): MemoryEmergencyState {
  const key = "__eldersafe_emergencies_memory__";
  const g = globalThis as typeof globalThis & {
    [key]?: MemoryEmergencyState;
  };
  if (!g[key]) {
    g[key] = {
      byId: new Map(),
      byToken: new Map(),
      byElderActive: new Map(),
    };
  }
  return g[key];
}

function hasSupabaseConfig(): boolean {
  return Boolean(tryGetSupabaseAnonConfig() && tryGetSupabaseServiceRoleKey());
}

export function generatePoliceShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createEmergency(input: {
  elderId: string;
  latitude: number | null;
  longitude: number | null;
  elderSnapshot: EmergencyElderSnapshot;
}): Promise<{ record: EmergencyRecord; storeMode: "supabase" | "memory" }> {
  if (hasSupabaseConfig()) {
    return createWithSupabase(input);
  }
  return createWithMemory(input);
}

export async function getEmergencyForElder(
  id: string,
  elderId: string,
): Promise<{
  record: EmergencyRecord | null;
  storeMode: "supabase" | "memory";
}> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("emergencies")
      .select(
        "id, elder_id, status, police_share_token, latitude, longitude, started_at, ended_at, created_at",
      )
      .eq("id", id)
      .eq("elder_id", elderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { record: null, storeMode: "supabase" };
    return { record: mapRow(data), storeMode: "supabase" };
  }

  const state = getMemoryEmergencyState();
  const record = state.byId.get(id) ?? null;
  if (!record || record.elderId !== elderId) {
    return { record: null, storeMode: "memory" };
  }
  return { record, storeMode: "memory" };
}

export async function findActiveEmergencyForElder(
  elderId: string,
): Promise<{
  record: EmergencyRecord | null;
  storeMode: "supabase" | "memory";
}> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("emergencies")
      .select(
        "id, elder_id, status, police_share_token, latitude, longitude, started_at, ended_at, created_at",
      )
      .eq("elder_id", elderId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { record: null, storeMode: "supabase" };
    return { record: mapRow(data), storeMode: "supabase" };
  }

  const state = getMemoryEmergencyState();
  const activeId = state.byElderActive.get(elderId);
  if (!activeId) return { record: null, storeMode: "memory" };
  return { record: state.byId.get(activeId) ?? null, storeMode: "memory" };
}

export async function endEmergencyForElder(input: {
  id: string;
  elderId: string;
  status: "resolved" | "cancelled";
}): Promise<{ record: EmergencyRecord; storeMode: "supabase" | "memory" }> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServiceClient();
    const endedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("emergencies")
      .update({ status: input.status, ended_at: endedAt })
      .eq("id", input.id)
      .eq("elder_id", input.elderId)
      .eq("status", "active")
      .select(
        "id, elder_id, status, police_share_token, latitude, longitude, started_at, ended_at, created_at",
      )
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("EMERGENCY_NOT_ACTIVE");
    return { record: mapRow(data), storeMode: "supabase" };
  }

  const state = getMemoryEmergencyState();
  const current = state.byId.get(input.id);
  if (!current || current.elderId !== input.elderId || current.status !== "active") {
    throw new Error("EMERGENCY_NOT_ACTIVE");
  }
  const next: EmergencyRecord = {
    ...current,
    status: input.status,
    endedAt: new Date().toISOString(),
  };
  state.byId.set(input.id, next);
  state.byElderActive.delete(input.elderId);
  return { record: next, storeMode: "memory" };
}

export async function getPublicTrackByToken(
  token: string,
): Promise<{
  payload: PublicTrackPayload | null;
  storeMode: "supabase" | "memory";
}> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServiceClient();
    const { data: emergency, error } = await supabase
      .from("emergencies")
      .select(
        "id, elder_id, status, started_at, police_share_token",
      )
      .eq("police_share_token", token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!emergency) return { payload: null, storeMode: "supabase" };

    const { data: elder, error: elderError } = await supabase
      .from("elders")
      .select("name, age, address, health_notes")
      .eq("id", emergency.elder_id)
      .maybeSingle();
    if (elderError) throw new Error(elderError.message);
    if (!elder) return { payload: null, storeMode: "supabase" };

    const { data: locations, error: locError } = await supabase
      .from("locations")
      .select("latitude, longitude, accuracy_m, recorded_at")
      .eq("emergency_id", emergency.id)
      .order("recorded_at", { ascending: true })
      .limit(200);
    if (locError) throw new Error(locError.message);

    return {
      storeMode: "supabase",
      payload: {
        emergency: {
          id: emergency.id as string,
          status: emergency.status as EmergencyStatus,
          startedAt: emergency.started_at as string,
        },
        elder: {
          name: elder.name as string,
          age: elder.age as number,
          address: elder.address as string,
          healthNotes: (elder.health_notes as string | null) ?? null,
        },
        locations: (locations ?? []).map((row) => ({
          latitude: row.latitude as number,
          longitude: row.longitude as number,
          accuracyM: (row.accuracy_m as number | null) ?? null,
          recordedAt: row.recorded_at as string,
        })),
      },
    };
  }

  const state = getMemoryEmergencyState();
  const id = state.byToken.get(token);
  if (!id) return { payload: null, storeMode: "memory" };
  const emergency = state.byId.get(id);
  if (!emergency?.elderSnapshot) return { payload: null, storeMode: "memory" };

  const { getMemoryLocationsForEmergency } = await import("./locations");
  const locations = getMemoryLocationsForEmergency(emergency.id);

  return {
    storeMode: "memory",
    payload: {
      emergency: {
        id: emergency.id,
        status: emergency.status,
        startedAt: emergency.startedAt,
      },
      elder: emergency.elderSnapshot,
      locations,
    },
  };
}

export function isMemoryEmergencyActiveForElder(
  elderId: string,
  emergencyId: string,
): boolean {
  const state = getMemoryEmergencyState();
  const record = state.byId.get(emergencyId);
  return Boolean(
    record && record.elderId === elderId && record.status === "active",
  );
}

async function createWithMemory(input: {
  elderId: string;
  latitude: number | null;
  longitude: number | null;
  elderSnapshot: EmergencyElderSnapshot;
}): Promise<{ record: EmergencyRecord; storeMode: "memory" }> {
  const state = getMemoryEmergencyState();
  const existingId = state.byElderActive.get(input.elderId);
  if (existingId) {
    const existing = state.byId.get(existingId);
    if (existing) return { record: existing, storeMode: "memory" };
  }

  const now = new Date().toISOString();
  const token = generatePoliceShareToken();
  const record: EmergencyRecord = {
    id: randomUUID(),
    elderId: input.elderId,
    status: "active",
    policeShareToken: token,
    latitude: input.latitude,
    longitude: input.longitude,
    startedAt: now,
    endedAt: null,
    createdAt: now,
    elderSnapshot: input.elderSnapshot,
  };
  state.byId.set(record.id, record);
  state.byToken.set(token, record.id);
  state.byElderActive.set(input.elderId, record.id);

  if (input.latitude != null && input.longitude != null) {
    const { insertLocationPoint } = await import("./locations");
    await insertLocationPoint({
      elderId: input.elderId,
      emergencyId: record.id,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyM: null,
    });
  }

  return { record, storeMode: "memory" };
}

async function createWithSupabase(input: {
  elderId: string;
  latitude: number | null;
  longitude: number | null;
  elderSnapshot: EmergencyElderSnapshot;
}): Promise<{ record: EmergencyRecord; storeMode: "supabase" }> {
  const supabase = createSupabaseServiceClient();

  const { data: existing } = await supabase
    .from("emergencies")
    .select(
      "id, elder_id, status, police_share_token, latitude, longitude, started_at, ended_at, created_at",
    )
    .eq("elder_id", input.elderId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { record: mapRow(existing), storeMode: "supabase" };
  }

  const token = generatePoliceShareToken();
  const { data, error } = await supabase
    .from("emergencies")
    .insert({
      elder_id: input.elderId,
      status: "active",
      police_share_token: token,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select(
      "id, elder_id, status, police_share_token, latitude, longitude, started_at, ended_at, created_at",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "EMERGENCY_CREATE_FAILED");
  }

  if (input.latitude != null && input.longitude != null) {
    const { error: locationError } = await supabase.from("locations").insert({
      elder_id: input.elderId,
      emergency_id: data.id,
      latitude: input.latitude,
      longitude: input.longitude,
    });
    if (locationError) throw new Error(locationError.message);
  }

  return { record: mapRow(data), storeMode: "supabase" };
}

function mapRow(row: Record<string, unknown>): EmergencyRecord {
  return {
    id: row.id as string,
    elderId: row.elder_id as string,
    status: row.status as EmergencyStatus,
    policeShareToken: row.police_share_token as string,
    latitude: (row.latitude as number | null) ?? null,
    longitude: (row.longitude as number | null) ?? null,
    startedAt: row.started_at as string,
    endedAt: (row.ended_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}
