import { NextResponse } from "next/server";
import {
  completeHelpRequest,
  getVolunteerIdBySession,
} from "@eldersafe/shared/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const volunteerId = getVolunteerIdBySession(token);
  if (!volunteerId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const item = await completeHelpRequest(id, volunteerId);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FAILED" },
      { status: 400 },
    );
  }
}
