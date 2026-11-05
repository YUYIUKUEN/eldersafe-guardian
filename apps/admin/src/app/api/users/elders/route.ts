import { NextResponse } from "next/server";
import { listElders, setElderDisabled } from "@eldersafe/shared/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const result = requireAdmin(request);
  if ("error" in result && result.error) return result.error;
  return NextResponse.json({ items: listElders() });
}

export async function PATCH(request: Request) {
  const result = requireAdmin(request);
  if ("error" in result && result.error) return result.error;
  const body = (await request.json()) as { deviceKey?: string; disabled?: boolean };
  if (!body.deviceKey || typeof body.disabled !== "boolean") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  try {
    const item = setElderDisabled(body.deviceKey, body.disabled);
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
}
