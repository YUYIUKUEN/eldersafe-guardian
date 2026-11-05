import { NextResponse } from "next/server";
import { clearAdminSession } from "@eldersafe/shared/server";
import { getBearer } from "@/lib/session";

export async function POST(request: Request) {
  clearAdminSession(getBearer(request));
  return NextResponse.json({ ok: true });
}
