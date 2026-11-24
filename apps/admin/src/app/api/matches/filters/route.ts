import { jsonSafeError, toSafeErrorCode } from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";
import { listMatchFilterOptions } from "@/lib/management/matches";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const result = await listMatchFilterOptions(auth.ctx.supabase);
    return Response.json(result);
  } catch (error) {
    return jsonSafeError(error, "load_failed", 500);
  }
}
