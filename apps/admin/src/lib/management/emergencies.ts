import type { SupabaseClient } from "@supabase/supabase-js";
import { policeTrackUrl } from "./format";

export const EMERGENCY_PAGE_SIZE = 20;

export type EmergencyStatus = "active" | "resolved" | "cancelled";

export type EmergencyListItem = {
  id: string;
  shortId: string;
  status: EmergencyStatus;
  elderId: string;
  elderName: string;
  startedAt: string;
  endedAt: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type EmergencyLocationPoint = {
  id: number;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  recordedAt: string;
};

export type EmergencyDetail = EmergencyListItem & {
  elderPhone: string;
  elderAddress: string;
  elderAge: number;
  policeShareToken: string;
  policeTrackUrl: string;
  locations: EmergencyLocationPoint[];
  logs: Array<{
    id: string;
    action: string;
    actorType: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
  }>;
};

type EmergencyRow = {
  id: string;
  status: EmergencyStatus;
  elder_id: string;
  started_at: string;
  ended_at: string | null;
  latitude: number | null;
  longitude: number | null;
  police_share_token: string;
  elders:
    | { name: string; phone?: string; address?: string; age?: number }
    | { name: string; phone?: string; address?: string; age?: number }[]
    | null;
};

function oneRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapListItem(row: EmergencyRow): EmergencyListItem {
  const elder = oneRelation(row.elders);
  return {
    id: row.id,
    shortId: row.id.slice(0, 8),
    status: row.status,
    elderId: row.elder_id,
    elderName: elder?.name ?? "—",
    startedAt: row.started_at,
    endedAt: row.ended_at,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

export async function listEmergencies(
  supabase: SupabaseClient,
  input: {
    status?: EmergencyStatus | "all";
    page?: number;
    pageSize?: number;
  },
) {
  const page = input.page && input.page > 0 ? input.page : 1;
  const pageSize =
    input.pageSize && input.pageSize > 0 ? input.pageSize : EMERGENCY_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("emergencies")
    .select(
      "id, status, elder_id, started_at, ended_at, latitude, longitude, police_share_token, elders(name)",
      { count: "exact" },
    )
    .order("status", { ascending: true })
    .order("started_at", { ascending: false });

  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const items = ((data ?? []) as EmergencyRow[]).map(mapListItem);
  // Ensure active emergencies stay at the top even if DB collation changes.
  items.sort((a, b) => {
    const rank = (status: EmergencyStatus) =>
      status === "active" ? 0 : status === "resolved" ? 1 : 2;
    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus !== 0) return byStatus;
    return b.startedAt.localeCompare(a.startedAt);
  });

  return {
    page,
    pageSize,
    total: count ?? 0,
    items,
  };
}

export async function getEmergencyDetail(
  supabase: SupabaseClient,
  id: string,
): Promise<EmergencyDetail | null> {
  const { data, error } = await supabase
    .from("emergencies")
    .select(
      "id, status, elder_id, started_at, ended_at, latitude, longitude, police_share_token, elders(name, phone, address, age)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as EmergencyRow;
  const elder = oneRelation(row.elders);

  const [locationsRes, logsRes] = await Promise.all([
    supabase
      .from("locations")
      .select("id, latitude, longitude, accuracy_m, recorded_at")
      .eq("emergency_id", id)
      .order("recorded_at", { ascending: true })
      .limit(500),
    supabase
      .from("activity_logs")
      .select("id, action, actor_type, created_at, metadata")
      .eq("target_type", "emergency")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (locationsRes.error) throw new Error(locationsRes.error.message);
  if (logsRes.error) throw new Error(logsRes.error.message);

  const locations = (locationsRes.data ?? []).map((item) => ({
    id: item.id as number,
    latitude: item.latitude as number,
    longitude: item.longitude as number,
    accuracyM: (item.accuracy_m as number | null) ?? null,
    recordedAt: item.recorded_at as string,
  }));

  // Seed map with the emergency's initial coordinates when no trail yet.
  if (
    locations.length === 0 &&
    row.latitude != null &&
    row.longitude != null
  ) {
    locations.push({
      id: 0,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracyM: null,
      recordedAt: row.started_at,
    });
  }

  return {
    ...mapListItem(row),
    elderPhone: elder?.phone ?? "—",
    elderAddress: elder?.address ?? "—",
    elderAge: elder?.age ?? 0,
    policeShareToken: row.police_share_token,
    policeTrackUrl: policeTrackUrl(row.police_share_token),
    locations,
    logs: (logsRes.data ?? []).map((item) => ({
      id: item.id as string,
      action: item.action as string,
      actorType: item.actor_type as string,
      createdAt: item.created_at as string,
      metadata: (item.metadata as Record<string, unknown> | null) ?? null,
    })),
  };
}
