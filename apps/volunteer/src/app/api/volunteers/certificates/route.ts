import {
  canAccessVolunteerApp,
  loadAccessContext,
  VolunteerActivityAction,
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

  const { data, error } = await supabase
    .from("certificates")
    .select("id, year_month, rank, generated_at, file_path")
    .eq("volunteer_id", user.id)
    .order("year_month", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("activity_logs").insert({
    actor_type: "volunteer",
    actor_id: user.id,
    action: VolunteerActivityAction.certificateList,
    target_type: "certificate",
    metadata: { count: data?.length ?? 0 },
  });

  return Response.json({
    certificates: (data ?? []).map((row) => ({
      id: row.id,
      yearMonth: row.year_month,
      rank: row.rank,
      generatedAt: row.generated_at,
      filePath: row.file_path,
    })),
  });
}
