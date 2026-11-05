import { NextResponse } from "next/server";
import {
  approveVolunteer,
  getVolunteerIdBySession,
} from "@eldersafe/shared/server";

/**
 * Temporary demo endpoint until admin site (Stage 4) can approve volunteers.
 * Enabled when DEMO_MODE=true.
 */
export async function POST(request: Request) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "DEMO_DISABLED" }, { status: 403 });
  }
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const volunteerId = getVolunteerIdBySession(token);
  if (!volunteerId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const volunteer = approveVolunteer(volunteerId);
  return NextResponse.json({
    volunteer: {
      id: volunteer.id,
      name: volunteer.name,
      approved: volunteer.approved,
      points: volunteer.points,
      email: volunteer.email,
    },
  });
}
