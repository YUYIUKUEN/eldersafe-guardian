import { NextResponse } from "next/server";
import {
  getVolunteer,
  getVolunteerIdBySession,
  listHelpRequests,
} from "@eldersafe/shared/server";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const volunteerId = getVolunteerIdBySession(token);
  if (!volunteerId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const volunteer = await getVolunteer(volunteerId);
  if (!volunteer) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const mine = new URL(request.url).searchParams.get("mine") === "1";
  const items = await listHelpRequests(mine ? { volunteerId } : undefined);

  return NextResponse.json({
    items,
    volunteer: {
      id: volunteer.id,
      approved: volunteer.approved,
      points: volunteer.points,
      name: volunteer.name,
    },
  });
}
