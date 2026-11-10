import { requireAdminApi } from "@/lib/auth/api";
import { getEmergencyDetail } from "@/lib/management/emergencies";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const detail = await getEmergencyDetail(auth.ctx.supabase, id);
    if (!detail) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json(detail);
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
