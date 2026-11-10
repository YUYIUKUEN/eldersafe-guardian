import { calculatePointsAward, type PointsBreakdown } from "./calculate";
import { createSupabaseServiceClient } from "../supabase/service";
import { tryGetSupabaseAnonConfig, tryGetSupabaseServiceRoleKey } from "../supabase/env";

export type AwardPointsInput = {
  helpRequestId: string;
  volunteerId: string;
  elderId: string;
  acceptedAt: string;
  completedAt: string;
  rating?: number | null;
};

export type AwardPointsResult = {
  awarded: boolean;
  deferred: false;
  alreadyAwarded: boolean;
  points: number;
  pointsId: string | null;
  breakdown: PointsBreakdown;
};

type MemoryPointsState = {
  byHelpRequestId: Map<
    string,
    {
      id: string;
      volunteerId: string;
      helpRequestId: string;
      points: number;
      createdAt: string;
      breakdown: PointsBreakdown;
    }
  >;
};

function getMemoryPointsState(): MemoryPointsState {
  const key = "__eldersafe_points_memory__";
  const g = globalThis as typeof globalThis & {
    [key]?: MemoryPointsState;
  };
  if (!g[key]) {
    g[key] = { byHelpRequestId: new Map() };
  }
  return g[key];
}

function hasSupabaseConfig(): boolean {
  return Boolean(tryGetSupabaseAnonConfig() && tryGetSupabaseServiceRoleKey());
}

/**
 * Insert a points row for a help request that is already elder-confirmed.
 * Prefer {@link confirmHelpRequestWithPoints} for the atomic confirm path.
 */
export async function awardPointsForConfirmedHelpRequest(
  input: AwardPointsInput,
): Promise<AwardPointsResult> {
  const scored = calculatePointsAward({
    acceptedAt: input.acceptedAt,
    completedAt: input.completedAt,
    rating: input.rating,
  });

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("points")
      .insert({
        volunteer_id: input.volunteerId,
        help_request_id: input.helpRequestId,
        points: scored.total,
      })
      .select("id, points")
      .maybeSingle();

    if (error) {
      // Unique violation — same help request already awarded.
      if (error.code === "23505") {
        return {
          awarded: false,
          deferred: false,
          alreadyAwarded: true,
          points: scored.total,
          pointsId: null,
          breakdown: scored.breakdown,
        };
      }
      throw new Error(error.message);
    }

    return {
      awarded: true,
      deferred: false,
      alreadyAwarded: false,
      points: (data?.points as number) ?? scored.total,
      pointsId: (data?.id as string) ?? null,
      breakdown: scored.breakdown,
    };
  }

  const state = getMemoryPointsState();
  if (state.byHelpRequestId.has(input.helpRequestId)) {
    const existing = state.byHelpRequestId.get(input.helpRequestId)!;
    return {
      awarded: false,
      deferred: false,
      alreadyAwarded: true,
      points: existing.points,
      pointsId: existing.id,
      breakdown: existing.breakdown,
    };
  }

  const id = crypto.randomUUID();
  const record = {
    id,
    volunteerId: input.volunteerId,
    helpRequestId: input.helpRequestId,
    points: scored.total,
    createdAt: new Date().toISOString(),
    breakdown: scored.breakdown,
  };
  state.byHelpRequestId.set(input.helpRequestId, record);

  return {
    awarded: true,
    deferred: false,
    alreadyAwarded: false,
    points: record.points,
    pointsId: record.id,
    breakdown: scored.breakdown,
  };
}

/** Memory-mode totals used by local demos / tests. */
export function listMemoryPointsForVolunteer(volunteerId: string): {
  totalPoints: number;
  monthPoints: number;
  entries: Array<{
    id: string;
    helpRequestId: string;
    points: number;
    createdAt: string;
  }>;
} {
  const state = getMemoryPointsState();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const entries = [...state.byHelpRequestId.values()]
    .filter((row) => row.volunteerId === volunteerId)
    .map((row) => ({
      id: row.id,
      helpRequestId: row.helpRequestId,
      points: row.points,
      createdAt: row.createdAt,
    }));

  const totalPoints = entries.reduce((sum, row) => sum + row.points, 0);
  const monthPoints = entries
    .filter((row) => row.createdAt.slice(0, 7) === yearMonth)
    .reduce((sum, row) => sum + row.points, 0);

  return { totalPoints, monthPoints, entries };
}

export type ConfirmWithPointsInput = {
  helpRequestId: string;
  elderId: string;
  volunteerId: string;
  acceptedAt: string;
  completedAt: string;
  rating?: number | null;
  /** Pre-updated help request fields for the memory path. */
  applyLocalConfirm?: () => void;
};

export type ConfirmWithPointsResult = {
  points: AwardPointsResult;
  elderConfirmedAt: string;
  rating: number | null;
  activityLogged: boolean;
};

/**
 * Atomic confirm + points + activity log via Postgres RPC (Supabase),
 * or the in-memory equivalent when Supabase is not configured.
 */
export async function confirmHelpRequestWithPoints(
  input: ConfirmWithPointsInput,
): Promise<ConfirmWithPointsResult> {
  const scored = calculatePointsAward({
    acceptedAt: input.acceptedAt,
    completedAt: input.completedAt,
    rating: input.rating,
  });
  const rating = scored.breakdown.rating;

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.rpc(
      "confirm_help_request_award_points",
      {
        p_help_request_id: input.helpRequestId,
        p_elder_id: input.elderId,
        p_points: scored.total,
        p_rating: rating,
        p_breakdown: scored.breakdown,
      },
    );

    if (error) {
      const message = error.message ?? "";
      if (message.includes("HELP_REQUEST_NOT_FOUND")) {
        throw new Error("HELP_REQUEST_NOT_FOUND");
      }
      if (message.includes("HELP_REQUEST_NOT_CONFIRMABLE")) {
        throw new Error("HELP_REQUEST_NOT_CONFIRMABLE");
      }
      if (message.includes("INVALID_RATING")) {
        throw new Error("INVALID_RATING");
      }
      throw new Error(message || "CONFIRM_POINTS_FAILED");
    }

    const payload = data as {
      pointsId?: string;
      points?: number;
      elderConfirmedAt?: string;
      rating?: number | null;
    };

    return {
      elderConfirmedAt: payload.elderConfirmedAt ?? new Date().toISOString(),
      rating: payload.rating ?? rating,
      activityLogged: true,
      points: {
        awarded: true,
        deferred: false,
        alreadyAwarded: false,
        points: payload.points ?? scored.total,
        pointsId: payload.pointsId ?? null,
        breakdown: scored.breakdown,
      },
    };
  }

  // Memory path: caller updates the help request, then we award once.
  input.applyLocalConfirm?.();
  const awarded = await awardPointsForConfirmedHelpRequest({
    helpRequestId: input.helpRequestId,
    volunteerId: input.volunteerId,
    elderId: input.elderId,
    acceptedAt: input.acceptedAt,
    completedAt: input.completedAt,
    rating,
  });

  if (awarded.alreadyAwarded) {
    throw new Error("HELP_REQUEST_NOT_CONFIRMABLE");
  }

  return {
    elderConfirmedAt: new Date().toISOString(),
    rating,
    activityLogged: false,
    points: awarded,
  };
}
