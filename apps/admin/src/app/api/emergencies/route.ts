import { parsePositiveInt, requireAdminApi } from "@/lib/auth/api";
import {
  EMERGENCY_PAGE_SIZE,
  listEmergencies,
  type EmergencyStatus,
} from "@/lib/management/emergencies";

const STATUSES = new Set(["all", "active", "resolved", "cancelled"]);

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const statusRaw = url.searchParams.get("status") ?? "all";
  const status = STATUSES.has(statusRaw)
    ? (statusRaw as EmergencyStatus | "all")
    : "all";
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(
    url.searchParams.get("pageSize"),
    EMERGENCY_PAGE_SIZE,
    100,
  );

  try {
    const result = await listEmergencies(auth.ctx.supabase, {
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
