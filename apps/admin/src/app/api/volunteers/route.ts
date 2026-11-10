import { parsePositiveInt, requireAdminApi } from "@/lib/auth/api";
import {
  listVolunteers,
  VOLUNTEER_PAGE_SIZE,
} from "@/lib/management/volunteers";
import type { VolunteerApprovalStatus } from "@eldersafe/shared";

const STATUSES = new Set([
  "all",
  "pending",
  "approved",
  "rejected",
  "disabled",
]);

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const statusRaw = url.searchParams.get("status") ?? "all";
  const status = STATUSES.has(statusRaw)
    ? (statusRaw as VolunteerApprovalStatus | "all")
    : "all";
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(
    url.searchParams.get("pageSize"),
    VOLUNTEER_PAGE_SIZE,
    100,
  );

  try {
    const result = await listVolunteers(auth.ctx.supabase, auth.ctx.service, {
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
