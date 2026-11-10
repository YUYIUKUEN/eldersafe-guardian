import { requireAdminApi } from "@/lib/auth/api";
import { listMatchFilterOptions } from "@/lib/management/matches";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const result = await listMatchFilterOptions(auth.ctx.supabase);
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
