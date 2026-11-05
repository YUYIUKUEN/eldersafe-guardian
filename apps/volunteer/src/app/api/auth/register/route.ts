import { NextResponse } from "next/server";
import {
  createVolunteerSession,
  registerVolunteer,
} from "@eldersafe/shared/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    age?: number;
    serviceAreas?: string;
    bio?: string;
  };

  if (
    !body.name ||
    !body.phone ||
    !body.email ||
    !body.password ||
    !body.age ||
    !body.serviceAreas ||
    !body.bio
  ) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  try {
    const volunteer = await registerVolunteer({
      name: body.name,
      phone: body.phone,
      email: body.email,
      password: body.password,
      age: Number(body.age),
      serviceAreas: body.serviceAreas
        .split(/[,，、]/)
        .map((item) => item.trim())
        .filter(Boolean),
      bio: body.bio,
    });
    const token = createVolunteerSession(volunteer.id);
    return NextResponse.json({
      token,
      volunteer: {
        id: volunteer.id,
        name: volunteer.name,
        email: volunteer.email,
        approved: volunteer.approved,
        points: volunteer.points,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FAILED";
    const status = message === "EMAIL_EXISTS" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
