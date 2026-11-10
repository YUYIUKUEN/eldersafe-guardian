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

  // Cap payload so the home list stays responsive with large demo seeds.
  const capped = items.slice(0, 80);
  return Response.json({
    items: capped,
    volunteerId: user.id,
    truncated: items.length > capped.length,
    total: items.length,
  });
}
