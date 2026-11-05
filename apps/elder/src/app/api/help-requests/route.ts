import { NextResponse } from "next/server";
import {
  createHelpRequestRecord,
  listHelpRequests,
  upsertElder,
} from "@eldersafe/shared/server";

export async function GET(request: Request) {
  const deviceKey = new URL(request.url).searchParams.get("deviceKey");
  if (!deviceKey) {
    return NextResponse.json({ error: "deviceKey required" }, { status: 400 });
  }
  return NextResponse.json({ items: listHelpRequests({ deviceKey }) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    deviceKey: string;
    elderName: string;
    elderAge: number;
    elderAddress: string;
    elderPhone: string;
    emergencyContact: string;
    healthNotes?: string;
    audioDataUrl: string;
    latitude?: number;
    longitude?: number;
  };

  if (!body.deviceKey || !body.audioDataUrl || !body.elderName) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  upsertElder({
    deviceKey: body.deviceKey,
    name: body.elderName,
    age: body.elderAge,
    phone: body.elderPhone,
    address: body.elderAddress,
    emergencyContact: body.emergencyContact,
    healthNotes: body.healthNotes,
    createdAt: new Date().toISOString(),
  });

  const item = createHelpRequestRecord({
    deviceKey: body.deviceKey,
    elderName: body.elderName,
    elderAge: body.elderAge,
    elderAddress: body.elderAddress,
    audioDataUrl: body.audioDataUrl,
    latitude: body.latitude,
    longitude: body.longitude,
  });

  return NextResponse.json({ item }, { status: 201 });
}
