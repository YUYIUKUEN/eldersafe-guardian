import {
  AdminActivityAction,
  isUuid,
  jsonSafeError,
  toSafeErrorCode,
} from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";
import { regenerateCertificatePdf } from "@/lib/management/leaderboard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }


  try {
    const certificate = await regenerateCertificatePdf(
      auth.ctx.supabase,
      auth.ctx.service,
      id,
    );

    await auth.ctx.service.from("activity_logs").insert({
      actor_type: "admin",
      actor_id: auth.ctx.user.id,
      action: AdminActivityAction.certificateRegenerate,
      target_type: "certificate",
      target_id: id,
      metadata: {
        yearMonth: certificate.yearMonth,
        rank: certificate.rank,
        volunteerId: certificate.volunteerId,
        filePath: certificate.filePath,
      },
    });

    return Response.json({ certificate });
  } catch (error) {
    const code = toSafeErrorCode(error, "regenerate_failed");
    const status = code === "CERTIFICATE_NOT_FOUND" ? 404 : 500;
    return Response.json({ error: code }, { status });
  }
}
