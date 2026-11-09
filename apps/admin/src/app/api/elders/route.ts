import { parsePositiveInt, requireAdminApi } from "@/lib/auth/api";
import { ELDER_PAGE_SIZE, listElders } from "@/lib/management/elders";

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
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(
    url.searchParams.get("pageSize"),
    ELDER_PAGE_SIZE,
    100,
  );

  try {
    const result = await listElders(auth.ctx.supabase, {
      q,
      status,
      page,
      pageSize,
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
