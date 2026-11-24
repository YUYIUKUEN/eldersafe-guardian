import { requireAdminApi } from "@/lib/auth/api";
import { listVolunteerEngagementCases } from "@/lib/management/engagement-cases";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const result = await listVolunteerEngagementCases(auth.ctx.supabase, id);
    if (!result.volunteer) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
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
