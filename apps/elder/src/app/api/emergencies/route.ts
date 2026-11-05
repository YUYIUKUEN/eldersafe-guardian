import { NextResponse } from "next/server";
import { createEmergencyRecord, upsertElder } from "@eldersafe/shared/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    deviceKey?: string;
    elderName?: string;
    elderAge?: number;
    elderPhone?: string;
    elderAddress?: string;
    emergencyContact?: string;
    healthNotes?: string;
    latitude?: number;
    longitude?: number;
    policeShareToken?: string;
  };

  if (!body.deviceKey || !body.elderName) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  await upsertElder({
    deviceKey: body.deviceKey,
    name: body.elderName,
    age: body.elderAge ?? 0,
    phone: body.elderPhone ?? "",
    address: body.elderAddress ?? "",
    emergencyContact: body.emergencyContact ?? "",
    healthNotes: body.healthNotes,
    createdAt: new Date().toISOString(),
  });

  const item = await createEmergencyRecord({
    deviceKey: body.deviceKey,
    elderName: body.elderName,
    latitude: body.latitude,
    longitude: body.longitude,
    locationUpdatedAt:
      body.latitude != null ? new Date().toISOString() : undefined,
    policeShareToken: body.policeShareToken,
  });

  return NextResponse.json({ item }, { status: 201 });
}
