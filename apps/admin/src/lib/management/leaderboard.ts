import {
  certificateObjectPath,
  CERTIFICATES_BUCKET,
  isValidYearMonth,
  mapMonthlyLeaderboardRows,
  resolvePodium,
  validatePodiumSelection,
  type PodiumResolution,
  type RankedVolunteer,
} from "@eldersafe/shared";
import { generateCertificatePdf } from "@eldersafe/shared/certificates/pdf";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SettlementRecord = {
  yearMonth: string;
  settledAt: string;
  settledBy: string;
  podium: Array<{
    volunteerId: string;
    name: string;
    rank: number;
    points: number;
    completedCount: number;
  }>;
};

export type CertificateRow = {
  id: string;
  volunteerId: string;
  volunteerName: string | null;
  yearMonth: string;
  rank: number;
  generatedAt: string;
  filePath: string;
};

export type MonthLeaderboardPayload = {
  yearMonth: string;
  settled: SettlementRecord | null;
  ranking: RankedVolunteer[];
  podium: PodiumResolution;
  certificates: CertificateRow[];
};

export async function loadMonthLeaderboard(
  service: SupabaseClient,
  yearMonth: string,
  limit = 10,
): Promise<MonthLeaderboardPayload> {
  if (!isValidYearMonth(yearMonth)) {
    throw new Error("INVALID_YEAR_MONTH");
  }

  const [rankRes, settleRes, certRes] = await Promise.all([
    service.rpc("get_monthly_leaderboard", {
      p_year_month: yearMonth,
      p_limit: limit,
    }),
    service
      .from("leaderboard_settlements")
      .select("year_month, settled_at, settled_by, podium")
      .eq("year_month", yearMonth)
      .maybeSingle(),
    service
      .from("certificates")
      .select(
        "id, volunteer_id, year_month, rank, generated_at, file_path, volunteers(name)",
      )
      .eq("year_month", yearMonth)
      .order("rank", { ascending: true }),
  ]);

  if (rankRes.error) throw new Error(rankRes.error.message);
  if (settleRes.error) throw new Error(settleRes.error.message);
  if (certRes.error) throw new Error(certRes.error.message);

  const ranking = mapMonthlyLeaderboardRows(
    (rankRes.data ?? []) as Array<{
      volunteer_id: string;
      full_name: string;
      points: number;
      completed_count: number;
      rank: number | string;
    }>,
  );

  const settled = settleRes.data
    ? {
        yearMonth: settleRes.data.year_month as string,
        settledAt: settleRes.data.settled_at as string,
        settledBy: settleRes.data.settled_by as string,
        podium: (settleRes.data.podium as SettlementRecord["podium"]) ?? [],
      }
    : null;

  const certificates: CertificateRow[] = (certRes.data ?? []).map((row) => {
    const volunteer = row.volunteers as
      | { name?: string }
      | { name?: string }[]
      | null;
    const volunteerName = Array.isArray(volunteer)
      ? volunteer[0]?.name ?? null
      : volunteer?.name ?? null;
    return {
      id: row.id as string,
      volunteerId: row.volunteer_id as string,
      volunteerName,
      yearMonth: row.year_month as string,
      rank: row.rank as number,
      generatedAt: row.generated_at as string,
      filePath: row.file_path as string,
    };
  });

  return {
    yearMonth,
    settled,
    ranking,
    podium: resolvePodium(ranking),
    certificates,
  };
}

async function uploadCertificatePdf(
  service: SupabaseClient,
  input: {
    yearMonth: string;
    rank: 1 | 2 | 3;
    volunteerId: string;
    volunteerName: string;
    points: number;
    completedCount: number;
  },
): Promise<string> {
  const bytes = await generateCertificatePdf({
    volunteerName: input.volunteerName,
    rank: input.rank,
    yearMonth: input.yearMonth,
    completedCount: input.completedCount,
    points: input.points,
    issuedAt: new Date(),
  });

  const objectPath = certificateObjectPath({
    yearMonth: input.yearMonth,
    rank: input.rank,
    volunteerId: input.volunteerId,
  });

  const { error } = await service.storage
    .from(CERTIFICATES_BUCKET)
    .upload(objectPath, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) throw new Error(error.message);
  return objectPath;
}

export async function settleMonthLeaderboard(
  reader: SupabaseClient,
  service: SupabaseClient,
  input: {
    yearMonth: string;
    adminId: string;
    podiumVolunteerIds?: string[];
  },
): Promise<{
  settlement: SettlementRecord;
  certificates: CertificateRow[];
}> {
  // Ranking RPC checks the caller JWT; prefer the admin user session.
  let snapshot: MonthLeaderboardPayload;
  try {
    snapshot = await loadMonthLeaderboard(reader, input.yearMonth, 50);
  } catch {
    snapshot = await loadMonthLeaderboard(service, input.yearMonth, 50);
  }
  if (snapshot.settled) {
    throw new Error("MONTH_ALREADY_SETTLED");
  }
  if (snapshot.ranking.length === 0) {
    throw new Error("NO_RANKING_DATA");
  }

  let top3: RankedVolunteer[];
  if (input.podiumVolunteerIds?.length) {
    top3 = validatePodiumSelection(
      snapshot.ranking,
      input.podiumVolunteerIds,
    );
  } else if (snapshot.podium.status === "clear") {
    top3 = snapshot.podium.top3;
  } else {
    throw new Error("PODIUM_DECISION_REQUIRED");
  }

  if (top3.length === 0) {
    throw new Error("NO_PODIUM");
  }

  const podiumPayload = top3.map((entry, index) => ({
    volunteerId: entry.volunteerId,
    name: entry.name,
    rank: (index + 1) as 1 | 2 | 3,
    points: entry.points,
    completedCount: entry.completedCount,
  }));

  const { error: settleError } = await service
    .from("leaderboard_settlements")
    .insert({
      year_month: input.yearMonth,
      settled_by: input.adminId,
      podium: podiumPayload,
    });

  if (settleError) {
    if (settleError.code === "23505") {
      throw new Error("MONTH_ALREADY_SETTLED");
    }
    throw new Error(settleError.message);
  }

  const certificates: CertificateRow[] = [];
  for (const seat of podiumPayload) {
    const filePath = await uploadCertificatePdf(service, {
      yearMonth: input.yearMonth,
      rank: seat.rank,
      volunteerId: seat.volunteerId,
      volunteerName: seat.name,
      points: seat.points,
      completedCount: seat.completedCount,
    });

    const { data, error } = await service
      .from("certificates")
      .insert({
        volunteer_id: seat.volunteerId,
        year_month: input.yearMonth,
        rank: seat.rank,
        file_path: filePath,
      })
      .select("id, volunteer_id, year_month, rank, generated_at, file_path")
      .single();

    if (error) throw new Error(error.message);
    certificates.push({
      id: data.id as string,
      volunteerId: data.volunteer_id as string,
      volunteerName: seat.name,
      yearMonth: data.year_month as string,
      rank: data.rank as number,
      generatedAt: data.generated_at as string,
      filePath: data.file_path as string,
    });
  }

  return {
    settlement: {
      yearMonth: input.yearMonth,
      settledAt: new Date().toISOString(),
      settledBy: input.adminId,
      podium: podiumPayload,
    },
    certificates,
  };
}

export async function regenerateCertificatePdf(
  reader: SupabaseClient,
  service: SupabaseClient,
  certificateId: string,
): Promise<CertificateRow> {
  const { data, error } = await service
    .from("certificates")
    .select(
      "id, volunteer_id, year_month, rank, generated_at, file_path, volunteers(name)",
    )
    .eq("id", certificateId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("CERTIFICATE_NOT_FOUND");

  const volunteer = data.volunteers as
    | { name?: string }
    | { name?: string }[]
    | null;
  const volunteerName = Array.isArray(volunteer)
    ? volunteer[0]?.name ?? "Volunteer"
    : volunteer?.name ?? "Volunteer";

  // Look up monthly points / completed for the certificate holder.
  let ranking: RankedVolunteer[];
  try {
    ranking = (
      await loadMonthLeaderboard(reader, data.year_month as string, 100)
    ).ranking;
  } catch {
    ranking = (
      await loadMonthLeaderboard(service, data.year_month as string, 100)
    ).ranking;
  }
  const stats = ranking.find((row) => row.volunteerId === data.volunteer_id);

  const filePath = await uploadCertificatePdf(service, {
    yearMonth: data.year_month as string,
    rank: data.rank as 1 | 2 | 3,
    volunteerId: data.volunteer_id as string,
    volunteerName,
    points: stats?.points ?? 0,
    completedCount: stats?.completedCount ?? 0,
  });

  const generatedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await service
    .from("certificates")
    .update({ file_path: filePath, generated_at: generatedAt })
    .eq("id", certificateId)
    .select("id, volunteer_id, year_month, rank, generated_at, file_path")
    .single();

  if (updateError) throw new Error(updateError.message);

  return {
    id: updated.id as string,
    volunteerId: updated.volunteer_id as string,
    volunteerName,
    yearMonth: updated.year_month as string,
    rank: updated.rank as number,
    generatedAt: updated.generated_at as string,
    filePath: updated.file_path as string,
  };
}

export async function createCertificateSignedUrl(
  service: SupabaseClient,
  filePath: string,
  expiresIn = 60 * 10,
): Promise<string> {
  const { data, error } = await service.storage
    .from(CERTIFICATES_BUCKET)
    .createSignedUrl(filePath, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "SIGNED_URL_FAILED");
  }
  return data.signedUrl;
}
