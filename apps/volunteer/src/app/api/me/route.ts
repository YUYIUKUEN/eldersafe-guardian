import { NextResponse } from "next/server";
import {
  getVolunteer,
  getVolunteerIdBySession,
} from "@eldersafe/shared/server";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const volunteerId = getVolunteerIdBySession(token);
  if (!volunteerId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const volunteer = getVolunteer(volunteerId);
  if (!volunteer) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json({
    volunteer: {
      id: volunteer.id,
      name: volunteer.name,
      email: volunteer.email,
      phone: volunteer.phone,
      age: volunteer.age,
      serviceAreas: volunteer.serviceAreas,
      bio: volunteer.bio,
      approved: volunteer.approved,
      points: volunteer.points,
    },
  });
}
