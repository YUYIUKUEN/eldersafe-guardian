import { requireAdminApi } from "@/lib/auth/api";
import { csvResponse, toCsv } from "@/lib/management/csv";
import { listElders } from "@/lib/management/elders";

const STATUSES = new Set(["all", "active", "disabled"]);

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const statusRaw = url.searchParams.get("status") ?? "all";
  const status = STATUSES.has(statusRaw)
    ? (statusRaw as "all" | "active" | "disabled")
    : "all";

  try {
    const result = await listElders(auth.ctx.supabase, {
      q,
      status,
      page: 1,
      pageSize: 5000,
    });

    const csv = toCsv(
      [
        "id",
        "name",
        "age",
        "phone",
        "address",
        "status",
        "last_active_at",
        "help_request_count",
        "created_at",
      ],
      result.items.map((item) => [
        item.id,
        item.name,
        item.age,
        item.phone,
        item.address,
        item.isDisabled ? "disabled" : "active",
        item.lastActiveAt,
        item.helpRequestCount,
        item.createdAt,
      ]),
    );

    return csvResponse("elders.csv", csv);
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
