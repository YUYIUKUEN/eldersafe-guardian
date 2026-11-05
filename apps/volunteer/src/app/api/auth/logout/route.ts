import { NextResponse } from "next/server";
import { clearVolunteerSession } from "@eldersafe/shared/server";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  clearVolunteerSession(token);
  return NextResponse.json({ ok: true });
}
