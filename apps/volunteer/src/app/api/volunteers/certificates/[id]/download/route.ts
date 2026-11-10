import {
  canAccessVolunteerApp,
  CERTIFICATES_BUCKET,
  createSupabaseServiceClient,
  loadAccessContext,
  VolunteerActivityAction,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

  const { id } = await context.params;
  const { data, error } = await supabase
    .from("certificates")
    .select("id, file_path, year_month, rank, volunteer_id")
    .eq("id", id)
    .eq("volunteer_id", user.id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const service = createSupabaseServiceClient();
    const { data: signed, error: signedError } = await service.storage
      .from(CERTIFICATES_BUCKET)
      .createSignedUrl(data.file_path as string, 60 * 10);

    if (signedError || !signed?.signedUrl) {
      throw new Error(signedError?.message ?? "signed_url_failed");
    }

    await supabase.from("activity_logs").insert({
      actor_type: "volunteer",
      actor_id: user.id,
      action: VolunteerActivityAction.certificateDownload,
      target_type: "certificate",
      target_id: id,
      metadata: {
        yearMonth: data.year_month,
        rank: data.rank,
      },
    });

    return Response.json({ url: signed.signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "download_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
