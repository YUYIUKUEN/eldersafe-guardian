import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAudioStoragePath } from "./format";

export const MATCH_PAGE_SIZE = 20;

export type HelpRequestStatus =
  | "pending"
  | "accepted"
  | "completed"
  | "cancelled";

export type MatchListItem = {
  id: string;
  shortId: string;
  status: HelpRequestStatus;
  elderId: string;
  elderName: string;
  volunteerId: string | null;
  volunteerName: string | null;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  elderConfirmedAt: string | null;
};

export type MatchLocationPoint = {
  id: number;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  recordedAt: string;
};

export type MatchDetail = MatchListItem & {
  audioPath: string;
  audioUrl: string | null;
  transcript: string | null;
  latitude: number | null;
  longitude: number | null;
  elderPhone: string;
  elderAddress: string;
  locations: MatchLocationPoint[];
  logs: Array<{
    id: string;
    action: string;
    actorType: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
  }>;
};

type HelpRow = {
  id: string;
  status: HelpRequestStatus;
  elder_id: string;
  volunteer_id: string | null;
  audio_path: string;
  transcript: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  elder_confirmed_at: string | null;
  elders:
    | { name: string; phone?: string; address?: string }
    | { name: string; phone?: string; address?: string }[]
    | null;
  volunteers: { name: string } | { name: string }[] | null;
};

function oneRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapListItem(row: HelpRow): MatchListItem {
  const elder = oneRelation(row.elders);
  const volunteer = oneRelation(row.volunteers);
  return {
    id: row.id,
    shortId: row.id.slice(0, 8),
    status: row.status,
    elderId: row.elder_id,
    elderName: elder?.name ?? "—",
    volunteerId: row.volunteer_id,
    volunteerName: volunteer?.name ?? null,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    elderConfirmedAt: row.elder_confirmed_at,
  };
}

export async function listMatches(
  supabase: SupabaseClient,
  input: {
    status?: HelpRequestStatus | "all";
    dateFrom?: string;
    dateTo?: string;
    elderId?: string;
    volunteerId?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const page = input.page && input.page > 0 ? input.page : 1;
  const pageSize =
    input.pageSize && input.pageSize > 0 ? input.pageSize : MATCH_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("help_requests")
    .select(
      "id, status, elder_id, volunteer_id, audio_path, transcript, latitude, longitude, created_at, accepted_at, completed_at, cancelled_at, elder_confirmed_at, elders(name), volunteers(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }
  if (input.elderId) query = query.eq("elder_id", input.elderId);
  if (input.volunteerId) query = query.eq("volunteer_id", input.volunteerId);
  if (input.dateFrom) {
    query = query.gte("created_at", `${input.dateFrom}T00:00:00+08:00`);
  }
  if (input.dateTo) {
    query = query.lt("created_at", nextDayIso(input.dateTo));
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    page,
    pageSize,
    total: count ?? 0,
    items: ((data ?? []) as HelpRow[]).map(mapListItem),
  };
}

function nextDayIso(yyyyMmDd: string) {
  const base = new Date(`${yyyyMmDd}T00:00:00+08:00`);
  base.setTime(base.getTime() + 24 * 60 * 60 * 1000);
  return base.toISOString();
}

export async function getMatchDetail(
  supabase: SupabaseClient,
  service: SupabaseClient,
  id: string,
): Promise<MatchDetail | null> {
  const { data, error } = await supabase
    .from("help_requests")
    .select(
      "id, status, elder_id, volunteer_id, audio_path, transcript, latitude, longitude, created_at, accepted_at, completed_at, cancelled_at, elder_confirmed_at, elders(name, phone, address), volunteers(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as HelpRow;
  const elder = oneRelation(row.elders);

  const [locationsRes, logsRes, audioUrl] = await Promise.all([
    supabase
      .from("locations")
      .select("id, latitude, longitude, accuracy_m, recorded_at")
      .eq("help_request_id", id)
      .order("recorded_at", { ascending: true })
      .limit(500),
    supabase
      .from("activity_logs")
      .select("id, action, actor_type, created_at, metadata")
      .eq("target_type", "help_request")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    createAudioSignedUrl(service, row.audio_path),
  ]);

  if (locationsRes.error) throw new Error(locationsRes.error.message);
  if (logsRes.error) throw new Error(logsRes.error.message);

  return {
    ...mapListItem(row),
    audioPath: row.audio_path,
    audioUrl,
    transcript: row.transcript,
    latitude: row.latitude,
    longitude: row.longitude,
    elderPhone: elder?.phone ?? "—",
    elderAddress: elder?.address ?? "—",
    locations: (locationsRes.data ?? []).map((item) => ({
      id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      accuracyM: item.accuracy_m,
      recordedAt: item.recorded_at,
    })),
    logs: (logsRes.data ?? []).map((item) => ({
      id: item.id,
      action: item.action,
      actorType: item.actor_type,
      createdAt: item.created_at,
      metadata: (item.metadata as Record<string, unknown> | null) ?? null,
    })),
  };
}

async function createAudioSignedUrl(
  service: SupabaseClient,
  audioPath: string,
): Promise<string | null> {
  try {
    const { bucket, path } = parseAudioStoragePath(audioPath);
    const { data, error } = await service.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 30);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function listMatchFilterOptions(supabase: SupabaseClient) {
  const [eldersRes, volunteersRes] = await Promise.all([
    supabase
      .from("elders")
      .select("id, name")
      .order("name", { ascending: true })
      .limit(500),
    supabase
      .from("volunteers")
      .select("id, name, approval_status")
      .order("name", { ascending: true })
      .limit(500),
  ]);

  if (eldersRes.error) throw new Error(eldersRes.error.message);
  if (volunteersRes.error) throw new Error(volunteersRes.error.message);

  return {
    elders: (eldersRes.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
    })),
    volunteers: (volunteersRes.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      approvalStatus: row.approval_status as string,
    })),
  };
}
