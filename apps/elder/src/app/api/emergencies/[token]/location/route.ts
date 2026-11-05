import { NextResponse } from "next/server";
import { updateEmergencyByToken } from "@eldersafe/shared/server";

type RouteContext = { params: Promise<{ token: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const body = (await request.json()) as {
    latitude?: number;
    longitude?: number;
  };
  if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const item = await updateEmergencyByToken(token, body.latitude, body.longitude);
  if (!item) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ item });
}
