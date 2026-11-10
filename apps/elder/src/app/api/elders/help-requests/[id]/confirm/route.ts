import { ElderActivityAction } from "@eldersafe/shared";
import { confirmHelpRequestForElder } from "@/lib/elder/help-requests";
import { resolveElderFromRequest } from "@/lib/elder/request-auth";
import { getElderStore } from "@/lib/elder/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const elder = await resolveElderFromRequest(request);
  const store = getElderStore();

  if (!elder) {
    await store.writeActivity({
      actorType: "system",
      action: ElderActivityAction.sessionFail,
      metadata: { reason: "help_request_confirm_unauthorized" },
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let rating: number | null = null;
  try {
    const body = (await request.json().catch(() => null)) as {
      rating?: unknown;
    } | null;
    if (body && "rating" in body) {
      rating = body.rating as number | null;
    }
  } catch {
    // Body is optional; invalid JSON treated as no rating.
  }

  try {
    const { record, storeMode, points, activityLogged } =
      await confirmHelpRequestForElder({
        id,
        elderId: elder.id,
        rating,
      });

    // Supabase RPC already wrote activity_logs inside the same transaction.
    // Memory mode still needs an explicit log write here.
    if (!activityLogged) {
      await store.writeActivity({
        actorType: "elder",
        actorId: elder.id,
        action: ElderActivityAction.helpRequestConfirm,
        targetType: "help_request",
        targetId: record.id,
        metadata: {
          storeMode,
          volunteerId: record.volunteerId,
          points: points.points,
          pointsId: points.pointsId,
          awarded: points.awarded,
          alreadyAwarded: points.alreadyAwarded,
          rating: points.breakdown.rating,
          breakdown: points.breakdown,
        },
      });
    }

    return Response.json({
      helpRequest: {
        id: record.id,
        status: record.status,
        elderConfirmedAt: record.elderConfirmedAt,
        volunteerName: record.volunteerName,
      },
      points: {
        awarded: points.awarded,
        alreadyAwarded: points.alreadyAwarded,
        points: points.points,
        pointsId: points.pointsId,
        breakdown: points.breakdown,
      },
      storeMode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "help_request_confirm_failed";
    const notConfirmable = message === "HELP_REQUEST_NOT_CONFIRMABLE";
    const notFound = message === "HELP_REQUEST_NOT_FOUND";
    const invalidRating = message === "INVALID_RATING";
    return Response.json(
      {
        error: notConfirmable
          ? "not_confirmable"
          : notFound
            ? "not_found"
            : invalidRating
              ? "invalid_rating"
              : message,
      },
      {
        status: notFound
          ? 404
          : invalidRating
            ? 400
            : notConfirmable
              ? 409
              : 500,
      },
    );
  }
}
