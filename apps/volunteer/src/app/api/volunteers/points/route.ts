import {
  canAccessVolunteerApp,
  getMonthCountdown,
  jsonSafeError,
  loadAccessContext,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  const yearMonth = getMonthCountdown().yearMonth;

  try {
    const [totalRes, monthRes, recentRes] = await Promise.all([
      supabase.rpc("volunteer_total_points", {
        p_volunteer_id: user.id,
      }),
      supabase.rpc("volunteer_month_points", {
        p_volunteer_id: user.id,
        p_year_month: yearMonth,
      }),
      supabase
        .from("points")
        .select("help_request_id, points, created_at")
        .eq("volunteer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (totalRes.error) {
      return jsonSafeError(totalRes.error, "points_failed", 500);
    }
    if (monthRes.error) {
      return jsonSafeError(monthRes.error, "points_failed", 500);
    }
    if (recentRes.error) {
      return jsonSafeError(recentRes.error, "points_failed", 500);
    }

    const recent = (recentRes.data ?? []).map((row) => ({
      helpRequestId: row.help_request_id as string,
      points: row.points as number,
      createdAt: row.created_at as string,
    }));

    return Response.json({
      totalPoints: Number(totalRes.data ?? 0),
      monthPoints: Number(monthRes.data ?? 0),
      yearMonth,
      recent,
    });
  } catch (error) {
    return jsonSafeError(error, "points_failed", 500);
  }
}