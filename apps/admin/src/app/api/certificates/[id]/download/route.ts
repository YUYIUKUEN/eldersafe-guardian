import {
  AdminActivityAction,
  isUuid,
  jsonSafeError,
  toSafeErrorCode,
} from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";
import { createCertificateSignedUrl } from "@/lib/management/leaderboard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const { data, error } = await auth.ctx.service
    .from("certificates")
    .select("id, file_path, volunteer_id, year_month, rank")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return jsonSafeError(error, "load_failed", 500);
  }
  if (!data) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const url = await createCertificateSignedUrl(
      auth.ctx.service,
      data.file_path as string,
    );

    await auth.ctx.service.from("activity_logs").insert({
      actor_type: "admin",
      actor_id: auth.ctx.user.id,
      action: AdminActivityAction.certificateDownload,
      target_type: "certificate",
      target_id: id,
      metadata: {
        yearMonth: data.year_month,
        rank: data.rank,
        volunteerId: data.volunteer_id,
      },
    });

    return Response.json({ url });
  } catch (err) {
    return jsonSafeError(err, "download_failed", 500);
  }
}
