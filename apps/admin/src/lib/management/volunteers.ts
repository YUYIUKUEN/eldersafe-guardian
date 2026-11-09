import type { SupabaseClient } from "@supabase/supabase-js";
import type { VolunteerApprovalStatus } from "@eldersafe/shared";

export const VOLUNTEER_PAGE_SIZE = 20;

export type VolunteerListItem = {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceAreas: string[];
  approvalStatus: VolunteerApprovalStatus;
  createdAt: string;
  completedServices: number;
};

export type VolunteerDetail = VolunteerListItem & {
  age: number;
  bio: string;
  updatedAt: string;
  helpRequests: Array<{
    id: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    elderName: string | null;
  }>;
  pointsTotal: number;
  points: Array<{
    id: string;
    points: number;
    createdAt: string;
    helpRequestId: string;
  }>;
  certificates: Array<{
    id: string;
    yearMonth: string;
    rank: number;
    generatedAt: string;
    filePath: string;
  }>;
  logs: Array<{
    id: string;
    action: string;
    actorType: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
  }>;
};

type VolunteerRow = {
  id: string;
  name: string;
  phone: string;
  age: number;
  service_areas: string[] | null;
  bio: string | null;
  approval_status: VolunteerApprovalStatus;
  created_at: string;
  updated_at: string;
};

async function emailMapForIds(
  service: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      const { data, error } = await service.auth.admin.getUserById(id);
      if (!error && data.user?.email) {
        map.set(id, data.user.email);
      }
    }),
  );
  return map;
}

async function findUserIdsByEmailQuery(
  service: SupabaseClient,
  query: string,
): Promise<string[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const matches: string[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;
    for (const user of data.users) {
      if (user.email?.toLowerCase().includes(needle)) {
        matches.push(user.id);
      }
    }
    if (data.users.length < 200) break;
  }
  return matches;
}

async function completedCountMap(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of ids) map.set(id, 0);
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from("help_requests")
    .select("volunteer_id")
    .in("volunteer_id", ids)
    .eq("status", "completed");

  if (error || !data) return map;
  for (const row of data) {
    if (!row.volunteer_id) continue;
    map.set(row.volunteer_id, (map.get(row.volunteer_id) ?? 0) + 1);
  }
  return map;
}

export async function listVolunteers(
  supabase: SupabaseClient,
  service: SupabaseClient,
  input: {
    q?: string;
    status?: VolunteerApprovalStatus | "all";
    page?: number;
    pageSize?: number;
  },
): Promise<{ items: VolunteerListItem[]; total: number; page: number; pageSize: number }> {
  const page = input.page && input.page > 0 ? input.page : 1;
  const pageSize = input.pageSize && input.pageSize > 0 ? input.pageSize : VOLUNTEER_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const q = input.q?.trim() ?? "";
  const status = input.status && input.status !== "all" ? input.status : null;

  let emailIds: string[] = [];
  if (q.includes("@") || q.includes(".")) {
    emailIds = await findUserIdsByEmailQuery(service, q);
  }

  let query = supabase
    .from("volunteers")
    .select(
      "id, name, phone, age, service_areas, bio, approval_status, created_at, updated_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("approval_status", status);
  }

  if (q) {
    const safe = q.replace(/[%_,()]/g, " ").trim();
    const pattern = `%${safe}%`;
    const parts = [
      `name.ilike.${pattern}`,
      `phone.ilike.${pattern}`,
      `bio.ilike.${pattern}`,
      ...emailIds.map((id) => `id.eq.${id}`),
    ];
    query = query.or(parts.join(","));
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as VolunteerRow[];
  const ids = rows.map((row) => row.id);
  const [emails, completed] = await Promise.all([
    emailMapForIds(service, ids),
    completedCountMap(supabase, ids),
  ]);

  return {
    page,
    pageSize,
    total: count ?? 0,
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: emails.get(row.id) ?? "",
      serviceAreas: row.service_areas ?? [],
      approvalStatus: row.approval_status,
      createdAt: row.created_at,
      completedServices: completed.get(row.id) ?? 0,
    })),
  };
}

export async function getVolunteerDetail(
  supabase: SupabaseClient,
  service: SupabaseClient,
  id: string,
): Promise<VolunteerDetail | null> {
  const { data, error } = await supabase
    .from("volunteers")
    .select(
      "id, name, phone, age, service_areas, bio, approval_status, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as VolunteerRow;
  const [emails, completed, helpRes, pointsRes, certRes, logsRes] =
    await Promise.all([
      emailMapForIds(service, [id]),
      completedCountMap(supabase, [id]),
      supabase
        .from("help_requests")
        .select(
          "id, status, created_at, completed_at, elders(name)",
        )
        .eq("volunteer_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("points")
        .select("id, points, created_at, help_request_id")
        .eq("volunteer_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("certificates")
        .select("id, year_month, rank, generated_at, file_path")
        .eq("volunteer_id", id)
        .order("year_month", { ascending: false })
        .limit(20),
      supabase
        .from("activity_logs")
        .select("id, action, actor_type, created_at, metadata")
        .eq("target_type", "volunteer")
        .eq("target_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (helpRes.error) throw new Error(helpRes.error.message);
  if (pointsRes.error) throw new Error(pointsRes.error.message);
  if (certRes.error) throw new Error(certRes.error.message);
  if (logsRes.error) throw new Error(logsRes.error.message);

  const points = pointsRes.data ?? [];
  const pointsTotal = points.reduce((sum, item) => sum + (item.points ?? 0), 0);

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: emails.get(row.id) ?? "",
    serviceAreas: row.service_areas ?? [],
    approvalStatus: row.approval_status,
    createdAt: row.created_at,
    completedServices: completed.get(row.id) ?? 0,
    age: row.age,
    bio: row.bio ?? "",
    updatedAt: row.updated_at,
    helpRequests: (helpRes.data ?? []).map((item) => {
      const elder = item.elders as { name?: string } | { name?: string }[] | null;
      const elderName = Array.isArray(elder)
        ? elder[0]?.name ?? null
        : elder?.name ?? null;
      return {
        id: item.id,
        status: item.status,
        createdAt: item.created_at,
        completedAt: item.completed_at,
        elderName,
      };
    }),
    pointsTotal,
    points: points.map((item) => ({
      id: item.id,
      points: item.points,
      createdAt: item.created_at,
      helpRequestId: item.help_request_id,
    })),
    certificates: (certRes.data ?? []).map((item) => ({
      id: item.id,
      yearMonth: item.year_month,
      rank: item.rank,
      generatedAt: item.generated_at,
      filePath: item.file_path,
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

export function nextVolunteerStatus(
  action: "approve" | "reject" | "disable" | "reactivate",
  current: VolunteerApprovalStatus,
): VolunteerApprovalStatus | null {
  switch (action) {
    case "approve":
      return current === "pending" || current === "rejected" ? "approved" : null;
    case "reject":
      return current === "pending" ? "rejected" : null;
    case "disable":
      return current === "approved" ? "disabled" : null;
    case "reactivate":
      return current === "disabled" || current === "rejected" ? "approved" : null;
    default:
      return null;
  }
}
