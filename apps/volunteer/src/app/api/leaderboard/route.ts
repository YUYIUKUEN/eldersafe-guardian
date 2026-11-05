import { NextResponse } from "next/server";
import { listLeaderboard } from "@eldersafe/shared/server";

export async function GET() {
  return NextResponse.json({ items: listLeaderboard() });
}
