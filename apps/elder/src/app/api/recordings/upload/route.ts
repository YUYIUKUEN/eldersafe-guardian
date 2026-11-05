import { NextResponse } from "next/server";
import { backendMode, uploadRecording } from "@eldersafe/shared/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const deviceKey = String(form.get("deviceKey") ?? "");
  const file = form.get("file");

  if (!deviceKey || !(file instanceof File)) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (backendMode() !== "supabase") {
    return NextResponse.json({
      mode: "local",
      path: null,
      publicUrl: null,
    });
  }

  const bytes = await file.arrayBuffer();
  const uploaded = await uploadRecording(
    deviceKey,
    bytes,
    file.type || "audio/webm",
  );
  return NextResponse.json({
    mode: "supabase",
    path: uploaded?.path ?? null,
    publicUrl: uploaded?.publicUrl ?? null,
  });
}
