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
  return NextResponse.json({ items: await listHelpRequests({ deviceKey }) });
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
    audioDataUrl?: string;
    audioPath?: string;
    audioUrl?: string;
    latitude?: number;
    longitude?: number;
  };

  if (!body.deviceKey || !body.elderName || !(body.audioDataUrl || body.audioUrl)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  await upsertElder({
    deviceKey: body.deviceKey,
    name: body.elderName,
    age: body.elderAge,
    phone: body.elderPhone,
    address: body.elderAddress,
    emergencyContact: body.emergencyContact,
    healthNotes: body.healthNotes,
    createdAt: new Date().toISOString(),
  });

  const item = await createHelpRequestRecord({
    deviceKey: body.deviceKey,
    elderName: body.elderName,
    elderAge: body.elderAge,
    elderAddress: body.elderAddress,
    audioDataUrl: body.audioUrl ?? body.audioDataUrl,
    audioPath: body.audioPath,
    audioUrl: body.audioUrl ?? body.audioDataUrl,
    latitude: body.latitude,
    longitude: body.longitude,
  });

  return NextResponse.json({ item }, { status: 201 });
}
