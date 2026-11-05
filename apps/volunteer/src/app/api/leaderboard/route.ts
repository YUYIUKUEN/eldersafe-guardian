import { NextResponse } from "next/server";
import { listLeaderboard, listMonthlyLeaderboard } from "@eldersafe/shared/server";

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? undefined;
  const scope = new URL(request.url).searchParams.get("scope");
  const items =
    scope === "month" || month
      ? await listMonthlyLeaderboard(month ?? undefined)
      : await listLeaderboard();
  return NextResponse.json({
    items,
    month: month ?? new Date().toISOString().slice(0, 7),
  });
}
