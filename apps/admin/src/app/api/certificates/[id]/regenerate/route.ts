import { AdminActivityAction } from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";
import { regenerateCertificatePdf } from "@/lib/management/leaderboard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

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
    const message =
      error instanceof Error ? error.message : "regenerate_failed";
    const status = message === "CERTIFICATE_NOT_FOUND" ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
