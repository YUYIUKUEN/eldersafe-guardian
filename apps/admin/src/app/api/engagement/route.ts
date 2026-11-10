import { requireAdminApi } from "@/lib/auth/api";
import {
  loadElderEngagement,
  loadVolunteerEngagement,
  sortElderEngagement,
  sortVolunteerEngagement,
} from "@/lib/management/engagement";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const volunteerSortBy = url.searchParams.get("volunteerSortBy") ?? "level";
  const volunteerSortDir =
    url.searchParams.get("volunteerSortDir") === "asc" ? "asc" : "desc";
  const elderSortBy = url.searchParams.get("elderSortBy") ?? "level";
  const elderSortDir =
    url.searchParams.get("elderSortDir") === "asc" ? "asc" : "desc";

  try {
    const [volunteersRaw, eldersRaw] = await Promise.all([
      loadVolunteerEngagement(auth.ctx.supabase),
      loadElderEngagement(auth.ctx.supabase),
    ]);

    return Response.json({
      volunteers: sortVolunteerEngagement(
        volunteersRaw,
        volunteerSortBy,
        volunteerSortDir,
      ),
      elders: sortElderEngagement(eldersRaw, elderSortBy, elderSortDir),
      rules: {
        volunteer: {
          high: "completed>=4 OR (accepted>=6 AND completionRate>=75)",
          medium: "accepted>=2 OR completed>=1",
          low: "otherwise",
        },
        elder: {
          high: "helpCount>=3",
          medium: "helpCount 1-2",
          low: "helpCount==0",
        },
      },
    });
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
