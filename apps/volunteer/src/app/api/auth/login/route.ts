import { NextResponse } from "next/server";
import {
  createVolunteerSession,
  loginVolunteer,
} from "@eldersafe/shared/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  try {
    const volunteer = await loginVolunteer(body.email, body.password);
    const token = createVolunteerSession(volunteer.id);
    return NextResponse.json({
      token,
      volunteer: {
        id: volunteer.id,
        name: volunteer.name,
        email: volunteer.email,
        approved: volunteer.approved,
        points: volunteer.points,
        serviceAreas: volunteer.serviceAreas,
        bio: volunteer.bio,
        age: volunteer.age,
        phone: volunteer.phone,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FAILED";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
