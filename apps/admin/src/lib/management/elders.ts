import {
  decodeEmergencyContact,
  type AppLocale,
} from "@eldersafe/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ELDER_PAGE_SIZE = 20;

export type ElderListItem = {
  id: string;
  name: string;
  age: number;
  phone: string;
  address: string;
  isDisabled: boolean;
  lastActiveAt: string;
  helpRequestCount: number;
  createdAt: string;
};

export type ElderDetail = ElderListItem & {
  emergencyContact: { name: string; phone: string };
  healthNotes: string | null;
  language: AppLocale;
  consentVersion: string;
  consentAcceptedAt: string;
  updatedAt: string;
  helpRequests: Array<{
    id: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    volunteerName: string | null;
  }>;
  emergencies: Array<{
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
  }>;
  logs: Array<{
    id: string;
    action: string;
    actorType: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
  }>;
};

type ElderRow = {
  id: string;
  name: string;
  age: number;
  phone: string;
  address: string;
  emergency_contact: string;
  health_notes: string | null;
  language: AppLocale;
  consent_version: string;
  consent_accepted_at: string;
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
};

async function helpCountAndLastActive(
  supabase: SupabaseClient,
  ids: string[],
  fallbackUpdatedAt: Map<string, string>,
): Promise<{
  counts: Map<string, number>;
  lastActive: Map<string, string>;
}> {
  const counts = new Map<string, number>();
  const lastActive = new Map<string, string>(fallbackUpdatedAt);
  for (const id of ids) counts.set(id, 0);
  if (ids.length === 0) return { counts, lastActive };

  const [helpRes, emergencyRes] = await Promise.all([
    supabase
      .from("help_requests")
      .select("elder_id, created_at")
      .in("elder_id", ids),
    supabase
      .from("emergencies")
      .select("elder_id, started_at")
      .in("elder_id", ids),
  ]);

  if (!helpRes.error && helpRes.data) {
    for (const row of helpRes.data) {
      counts.set(row.elder_id, (counts.get(row.elder_id) ?? 0) + 1);
      const prev = lastActive.get(row.elder_id);
      if (!prev || row.created_at > prev) {
        lastActive.set(row.elder_id, row.created_at);
      }
    }
  }

  if (!emergencyRes.error && emergencyRes.data) {
    for (const row of emergencyRes.data) {
      const prev = lastActive.get(row.elder_id);
      if (!prev || row.started_at > prev) {
        lastActive.set(row.elder_id, row.started_at);
      }
    }
  }

  return { counts, lastActive };
}

export async function listElders(
  supabase: SupabaseClient,
  input: {
    q?: string;
    status?: "all" | "active" | "disabled";
    page?: number;
    pageSize?: number;
  },
): Promise<{ items: ElderListItem[]; total: number; page: number; pageSize: number }> {
  const page = input.page && input.page > 0 ? input.page : 1;
  const pageSize = input.pageSize && input.pageSize > 0 ? input.pageSize : ELDER_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const q = input.q?.trim() ?? "";
  const status = input.status ?? "all";

  let query = supabase
    .from("elders")
    .select(
      "id, name, age, phone, address, emergency_contact, health_notes, language, consent_version, consent_accepted_at, is_disabled, created_at, updated_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (status === "active") query = query.eq("is_disabled", false);
  if (status === "disabled") query = query.eq("is_disabled", true);

  if (q) {
    const safe = q.replace(/[%_,()]/g, " ").trim();
    const pattern = `%${safe}%`;
    query = query.or(
      `name.ilike.${pattern},phone.ilike.${pattern},address.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ElderRow[];
  const ids = rows.map((row) => row.id);
  const fallback = new Map(rows.map((row) => [row.id, row.updated_at]));
  const { counts, lastActive } = await helpCountAndLastActive(
    supabase,
    ids,
    fallback,
  );

  return {
    page,
    pageSize,
    total: count ?? 0,
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      age: row.age,
      phone: row.phone,
      address: row.address,
      isDisabled: row.is_disabled,
      lastActiveAt: lastActive.get(row.id) ?? row.updated_at,
      helpRequestCount: counts.get(row.id) ?? 0,
      createdAt: row.created_at,
    })),
  };
}

export async function getElderDetail(
  supabase: SupabaseClient,
  id: string,
): Promise<ElderDetail | null> {
  const { data, error } = await supabase
    .from("elders")
    .select(
      "id, name, age, phone, address, emergency_contact, health_notes, language, consent_version, consent_accepted_at, is_disabled, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as ElderRow;
  const fallback = new Map([[row.id, row.updated_at]]);
  const [{ counts, lastActive }, helpRes, emergencyRes, logsRes] =
    await Promise.all([
      helpCountAndLastActive(supabase, [id], fallback),
      supabase
        .from("help_requests")
        .select("id, status, created_at, completed_at, volunteers(name)")
        .eq("elder_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("emergencies")
        .select("id, status, started_at, ended_at")
        .eq("elder_id", id)
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("activity_logs")
        .select("id, action, actor_type, created_at, metadata")
        .eq("target_type", "elder")
        .eq("target_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (helpRes.error) throw new Error(helpRes.error.message);
  if (emergencyRes.error) throw new Error(emergencyRes.error.message);
  if (logsRes.error) throw new Error(logsRes.error.message);

  return {
    id: row.id,
    name: row.name,
    age: row.age,
    phone: row.phone,
    address: row.address,
    isDisabled: row.is_disabled,
    lastActiveAt: lastActive.get(row.id) ?? row.updated_at,
    helpRequestCount: counts.get(row.id) ?? 0,
    createdAt: row.created_at,
    emergencyContact: decodeEmergencyContact(row.emergency_contact),
    healthNotes: row.health_notes,
    language: row.language,
    consentVersion: row.consent_version,
    consentAcceptedAt: row.consent_accepted_at,
    updatedAt: row.updated_at,
    helpRequests: (helpRes.data ?? []).map((item) => {
      const volunteer = item.volunteers as
        | { name?: string }
        | { name?: string }[]
        | null;
      const volunteerName = Array.isArray(volunteer)
        ? volunteer[0]?.name ?? null
        : volunteer?.name ?? null;
      return {
        id: item.id,
        status: item.status,
        createdAt: item.created_at,
        completedAt: item.completed_at,
        volunteerName,
      };
    }),
    emergencies: (emergencyRes.data ?? []).map((item) => ({
      id: item.id,
      status: item.status,
      startedAt: item.started_at,
      endedAt: item.ended_at,
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
