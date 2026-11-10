import { parsePositiveInt, requireAdminApi } from "@/lib/auth/api";
import {
  ACTION_CATEGORIES,
  listActivityLogs,
  LOG_PAGE_SIZE,
  type ActionCategory,
  type ActorType,
} from "@/lib/management/logs";

const ACTOR_TYPES = new Set(["all", "elder", "volunteer", "admin", "system"]);

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const actorTypeRaw = url.searchParams.get("actorType") ?? "all";
  const actorType = ACTOR_TYPES.has(actorTypeRaw)
    ? (actorTypeRaw as ActorType | "all")
    : "all";
  const categoryRaw = url.searchParams.get("actionCategory") ?? "all";
  const actionCategory = (ACTION_CATEGORIES as readonly string[]).includes(
    categoryRaw,
  )
    ? (categoryRaw as ActionCategory)
    : "all";

  try {
    const result = await listActivityLogs(auth.ctx.supabase, {
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      actorType,
      actionCategory,
      q: url.searchParams.get("q") ?? undefined,
      page: parsePositiveInt(url.searchParams.get("page"), 1),
      pageSize: parsePositiveInt(
        url.searchParams.get("pageSize"),
        LOG_PAGE_SIZE,
        100,
      ),
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: "load_failed",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
