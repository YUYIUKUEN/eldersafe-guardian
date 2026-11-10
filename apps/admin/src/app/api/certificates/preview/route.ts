import {
  generateCertificatePdf,
  isValidYearMonth,
  type CertificatePdfInput,
} from "@eldersafe/shared";
import { requireAdminApi } from "@/lib/auth/api";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: Partial<CertificatePdfInput> & { rank?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = body.volunteerName?.trim();
  const yearMonth = body.yearMonth?.trim() ?? "";
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
      orgNameZh: body.orgNameZh,
      orgNameEn: body.orgNameEn,
      issuedAt: body.issuedAt ? new Date(body.issuedAt) : new Date(),
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
    const message =
      error instanceof Error ? error.message : "preview_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
