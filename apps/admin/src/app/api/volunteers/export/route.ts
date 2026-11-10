import type { VolunteerApprovalStatus } from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";
import { csvResponse, toCsv } from "@/lib/management/csv";
import { listVolunteers } from "@/lib/management/volunteers";

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

  try {
    const result = await listVolunteers(auth.ctx.supabase, auth.ctx.service, {
      q,
      status,
      page: 1,
      pageSize: 5000,
    });

    const csv = toCsv(
      [
        "id",
        "name",
        "phone",
        "email",
        "service_areas",
        "status",
        "registered_at",
        "completed_services",
      ],
      result.items.map((item) => [
        item.id,
        item.name,
        item.phone,
        item.email,
        item.serviceAreas.join("; "),
        item.approvalStatus,
        item.createdAt,
        item.completedServices,
      ]),
    );

    return csvResponse("volunteers.csv", csv);
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
