import { jsonSafeError } from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";

export type OverdueConfirmationItem = {
  id: string;
  elderId: string;
  volunteerId: string | null;
  elderName: string;
  volunteerName: string | null;
  acceptedAt: string | null;
  completedAt: string;
  hoursWaiting: number;
};

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.ctx.supabase.rpc(
    "admin_list_overdue_elder_confirmations",
  );

  if (error) {
    return jsonSafeError(error, "overdue_list_failed", 500);
  }

  const items: OverdueConfirmationItem[] = (data ?? []).map(
    (row: Record<string, unknown>) => ({
      id: row.id as string,
      elderId: row.elder_id as string,
      volunteerId: (row.volunteer_id as string | null) ?? null,
      elderName: (row.elder_name as string | null) ?? "—",
      volunteerName: (row.volunteer_name as string | null) ?? null,
      acceptedAt: (row.accepted_at as string | null) ?? null,
      completedAt: row.completed_at as string,
      hoursWaiting: Number(row.hours_waiting ?? 0),
    }),
  );

  return Response.json({ items });
}
