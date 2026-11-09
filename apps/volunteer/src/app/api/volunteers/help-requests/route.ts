import {
  canAccessVolunteerApp,
  loadAccessContext,
  mapVolunteerHelpFeedRow,
  type VolunteerHelpFeedItem,
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

  const { data, error } = await supabase.rpc("list_volunteer_help_feed");
  if (error) {
    return Response.json(
      { error: "feed_failed", detail: error.message },
      { status: 500 },
    );
  }

  const items: VolunteerHelpFeedItem[] = [];
  for (const row of data ?? []) {
    const mapped = mapVolunteerHelpFeedRow(row);
    if (mapped) items.push(mapped);
  }

  return Response.json({ items, volunteerId: user.id });
}
