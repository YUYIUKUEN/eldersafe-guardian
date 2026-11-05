import { NextResponse } from "next/server";
import { listLeaderboard, listMonthlyLeaderboard } from "@eldersafe/shared/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const result = await requireAdmin(request);
  if ("error" in result && result.error) return result.error;
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? undefined;
  const scope = url.searchParams.get("scope");
  const items =
    scope === "month" || month
      ? await listMonthlyLeaderboard(month ?? undefined)
      : await listLeaderboard();
  return NextResponse.json({
    items,
    month: month ?? new Date().toISOString().slice(0, 7),
  });
}
