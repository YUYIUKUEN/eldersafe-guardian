import { NextResponse } from "next/server";
import { listEmergencies } from "@eldersafe/shared/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const result = await requireAdmin(request);
  if ("error" in result && result.error) return result.error;
  return NextResponse.json({ items: await listEmergencies() });
}
