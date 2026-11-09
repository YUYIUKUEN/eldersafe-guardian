import {
  canAccessVolunteerApp,
  loadAccessContext,
  mapVolunteerHelpFeedRow,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

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

  const { data, error } = await supabase.rpc("get_volunteer_help_request", {
    target_id: id,
  });

  if (error) {
    return Response.json(
      { error: "load_failed", detail: error.message },
      { status: 500 },
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const item = mapVolunteerHelpFeedRow(row);
  if (!item) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({ item, volunteerId: user.id });
}
