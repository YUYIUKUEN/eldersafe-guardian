import {
  isValidYearMonth,
  type CertificatePdfInput,
  jsonSafeError,
  readJsonBody,
  toSafeErrorCode,
} from "@eldersafe/shared";
import { generateCertificatePdf } from "@eldersafe/shared/certificates/pdf";
import { requireAdminApi } from "@/lib/auth/api";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = await readJsonBody<{
    volunteerName?: unknown;
    yearMonth?: unknown;
    rank?: unknown;
    completedCount?: unknown;
    points?: unknown;
    orgNameZh?: unknown;
    orgNameEn?: unknown;
    issuedAt?: unknown;
  }>(request, 8192);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.value;

  const name =
    typeof body.volunteerName === "string" ? body.volunteerName.trim() : "";
  const yearMonth =
    typeof body.yearMonth === "string" ? body.yearMonth.trim() : "";
  const rank = body.rank;
  const completedCount = Number(body.completedCount ?? 0);
  const points =
    body.points == null || body.points === undefined
      ? undefined
      : Number(body.points);

  if (!name) {
    return Response.json({ error: "name_required" }, { status: 400 });
  }
  if (!isValidYearMonth(yearMonth)) {
    return Response.json({ error: "invalid_year_month" }, { status: 400 });
  }
  if (rank !== 1 && rank !== 2 && rank !== 3) {
    return Response.json({ error: "invalid_rank" }, { status: 400 });
  }
  if (!Number.isInteger(completedCount) || completedCount < 0) {
    return Response.json({ error: "invalid_completed_count" }, { status: 400 });
  }

  try {
    const bytes = await generateCertificatePdf({
      volunteerName: name,
      yearMonth,
      rank,
      completedCount,
      points: Number.isFinite(points) ? points : undefined,
      orgNameZh:
        typeof body.orgNameZh === "string" ? body.orgNameZh : undefined,
      orgNameEn:
        typeof body.orgNameEn === "string" ? body.orgNameEn : undefined,
      issuedAt:
        typeof body.issuedAt === "string" || typeof body.issuedAt === "number"
          ? new Date(body.issuedAt)
          : new Date(),
    });

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certificate-preview.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonSafeError(error, "preview_failed", 500);
  }
}
