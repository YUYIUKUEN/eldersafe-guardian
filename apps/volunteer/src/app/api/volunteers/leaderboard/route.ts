import {
  canAccessVolunteerApp,
  loadAccessContext,
  VolunteerActivityAction,
} from "@eldersafe/shared";
import {
  loadVolunteerLeaderboard,
  parseLeaderboardPeriod,
} from "@/lib/leaderboard/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return Response.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const access = await loadAccessContext(supabase, user.id);
  if (!canAccessVolunteerApp(access)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const period = parseLeaderboardPeriod(url.searchParams.get("period"));

  try {
    const payload = await loadVolunteerLeaderboard(supabase, {
      userId: user.id,
      period,
    });

    // Avoid flooding logs on the 60s auto-refresh — only log explicit first loads
    // when the client sends ?log=1.
    if (url.searchParams.get("log") === "1") {
      await supabase.from("activity_logs").insert({
        actor_type: "volunteer",
        actor_id: user.id,
        action: VolunteerActivityAction.leaderboardView,
        target_type: "leaderboard",
        metadata: { period },
      });
    }

    return Response.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "leaderboard_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
