import type { SupabaseClient } from "@supabase/supabase-js";

export const LOG_PAGE_SIZE = 30;

export type ActorType = "elder" | "volunteer" | "admin" | "system";

export type LogListItem = {
  id: string;
  createdAt: string;
  actorType: ActorType;
  actorId: string | null;
  actorName: string;
  action: string;
  actionCategory: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string;
  detail: string;
};

export const ACTION_CATEGORIES = [
  "all",
  "elder",
  "volunteer",
  "admin",
  "system",
  "help",
  "emergency",
  "auth",
  "other",
] as const;

export type ActionCategory = (typeof ACTION_CATEGORIES)[number];

export function actionCategoryOf(action: string): Exclude<ActionCategory, "all"> {
  if (action.startsWith("elder.")) return "elder";
  if (action.startsWith("volunteer.")) {
    if (
      action.includes("login") ||
      action.includes("logout") ||
      action.includes("password") ||
      action.includes("register")
    ) {
      return "auth";
    }
    return "volunteer";
  }
  if (action.startsWith("admin.")) {
    if (action.includes("login") || action.includes("logout")) return "auth";
    if (action.includes("help")) return "help";
    if (action.includes("emergency")) return "emergency";
    return "admin";
  }
  if (action.includes("help_request") || action.includes(".help.")) return "help";
  if (action.includes("emergency")) return "emergency";
  return "other";
}

type LogRow = {
  id: string;
  created_at: string;
  actor_type: ActorType;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
};

function formatDetail(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) return "—";
  try {
    return JSON.stringify(metadata);
  } catch {
    return "—";
  }
}

async function resolveNames(
  supabase: SupabaseClient,
  rows: LogRow[],
): Promise<{
  actors: Map<string, string>;
  targets: Map<string, string>;
}> {
  const elderIds = new Set<string>();
  const volunteerIds = new Set<string>();
  const adminIds = new Set<string>();

  for (const row of rows) {
    if (row.actor_id) {
      if (row.actor_type === "elder") elderIds.add(row.actor_id);
      if (row.actor_type === "volunteer") volunteerIds.add(row.actor_id);
      if (row.actor_type === "admin") adminIds.add(row.actor_id);
    }
    if (row.target_id && row.target_type === "elder") elderIds.add(row.target_id);
    if (row.target_id && row.target_type === "volunteer") {
      volunteerIds.add(row.target_id);
    }
  }

  const actors = new Map<string, string>();
  const targets = new Map<string, string>();

  const [eldersRes, volunteersRes, profilesRes] = await Promise.all([
    elderIds.size
      ? supabase.from("elders").select("id, name").in("id", [...elderIds])
      : Promise.resolve({ data: [], error: null }),
    volunteerIds.size
      ? supabase
          .from("volunteers")
          .select("id, name")
          .in("id", [...volunteerIds])
      : Promise.resolve({ data: [], error: null }),
    adminIds.size
      ? supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", [...adminIds])
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const row of eldersRes.data ?? []) {
    actors.set(`elder:${row.id}`, row.name);
    targets.set(`elder:${row.id}`, row.name);
  }
  for (const row of volunteersRes.data ?? []) {
    actors.set(`volunteer:${row.id}`, row.name);
    targets.set(`volunteer:${row.id}`, row.name);
  }
  for (const row of profilesRes.data ?? []) {
    actors.set(
      `admin:${row.id}`,
      (row.display_name as string | null) || row.id.slice(0, 8),
    );
  }

  return { actors, targets };
}

export async function listActivityLogs(
  supabase: SupabaseClient,
  input: {
    dateFrom?: string;
    dateTo?: string;
    actorType?: ActorType | "all";
    actionCategory?: ActionCategory;
    q?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const page = input.page && input.page > 0 ? input.page : 1;
  const pageSize =
    input.pageSize && input.pageSize > 0 ? input.pageSize : LOG_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const q = input.q?.trim() ?? "";
  const category = input.actionCategory ?? "all";

  let query = supabase
    .from("activity_logs")
    .select(
      "id, created_at, actor_type, actor_id, action, target_type, target_id, metadata",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (input.actorType && input.actorType !== "all") {
    query = query.eq("actor_type", input.actorType);
  }
  if (input.dateFrom) {
    query = query.gte("created_at", `${input.dateFrom}T00:00:00+08:00`);
  }
  if (input.dateTo) {
    const end = new Date(`${input.dateTo}T00:00:00+08:00`);
    end.setTime(end.getTime() + 24 * 60 * 60 * 1000);
    query = query.lt("created_at", end.toISOString());
  }
  if (q) {
    const safe = q.replace(/[%_,()]/g, " ").trim();
    const pattern = `%${safe}%`;
    query = query.or(
      `action.ilike.${pattern},actor_id.ilike.${pattern},target_id.ilike.${pattern},target_type.ilike.${pattern}`,
    );
  }

  // Prefer SQL prefix filters; auth/other need a light in-app pass.
  if (category === "elder") query = query.like("action", "elder.%");
  if (category === "volunteer") query = query.like("action", "volunteer.%");
  if (category === "admin") query = query.like("action", "admin.%");
  if (category === "help") query = query.ilike("action", "%help%");
  if (category === "emergency") query = query.ilike("action", "%emergency%");

  const needsClientCategory = category === "auth" || category === "other";
  const rangeFrom = needsClientCategory ? 0 : from;
  const rangeTo = needsClientCategory
    ? Math.min(from + pageSize * 30, 3000) - 1
    : to;

  const { data, error, count } = await query.range(rangeFrom, rangeTo);
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as LogRow[];
  if (needsClientCategory) {
    rows = rows.filter((row) => actionCategoryOf(row.action) === category);
  } else if (category === "volunteer") {
    // SQL volunteer.% also includes auth-ish volunteer actions; keep them here.
    rows = rows;
  }

  const total = needsClientCategory ? rows.length : (count ?? 0);
  const pageRows = needsClientCategory
    ? rows.slice(from, from + pageSize)
    : rows;
  const { actors, targets } = await resolveNames(supabase, pageRows);

  const items: LogListItem[] = pageRows.map((row) => {
    const actorKey = row.actor_id
      ? `${row.actor_type}:${row.actor_id}`
      : null;
    const actorName =
      row.actor_type === "system"
        ? "System"
        : (actorKey && actors.get(actorKey)) ||
          row.actor_id?.slice(0, 8) ||
          "—";
    const targetKey =
      row.target_type && row.target_id
        ? `${row.target_type}:${row.target_id}`
        : null;
    const targetLabel = targetKey
      ? targets.get(targetKey) ||
        `${row.target_type}:${row.target_id?.slice(0, 8) ?? ""}`
      : row.target_type || "—";

    return {
      id: row.id,
      createdAt: row.created_at,
      actorType: row.actor_type,
      actorId: row.actor_id,
      actorName,
      action: row.action,
      actionCategory: actionCategoryOf(row.action),
      targetType: row.target_type,
      targetId: row.target_id,
      targetLabel,
      detail: formatDetail(row.metadata),
    };
  });

  return { page, pageSize, total, items };
}
