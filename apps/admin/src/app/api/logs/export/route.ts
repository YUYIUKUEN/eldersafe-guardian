import { requireAdminApi } from "@/lib/auth/api";
import { csvResponse, toCsv } from "@/lib/management/csv";
import {
  ACTION_CATEGORIES,
  listActivityLogs,
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
      page: 1,
      pageSize: 5000,
    });

    const csv = toCsv(
      [
        "created_at",
        "actor_type",
        "actor_name",
        "actor_id",
        "action",
        "action_category",
        "target_type",
        "target_label",
        "target_id",
        "detail",
      ],
      result.items.map((item) => [
        item.createdAt,
        item.actorType,
        item.actorName,
        item.actorId,
        item.action,
        item.actionCategory,
        item.targetType,
        item.targetLabel,
        item.targetId,
        item.detail,
      ]),
    );

    return csvResponse("activity-logs.csv", csv);
  } catch (error) {
    return Response.json(
      {
        error: "export_failed",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
