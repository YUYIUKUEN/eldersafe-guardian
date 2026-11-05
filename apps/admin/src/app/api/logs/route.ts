import { NextResponse } from "next/server";
import { listActivityLogs } from "@eldersafe/shared/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const result = requireAdmin(request);
  if ("error" in result && result.error) return result.error;
  const url = new URL(request.url);
  const actorType = url.searchParams.get("actorType") as
    | "elder"
    | "volunteer"
    | "admin"
    | "system"
    | null;
  const action = url.searchParams.get("action") ?? undefined;
  return NextResponse.json({
    items: listActivityLogs({
      actorType: actorType || undefined,
      action,
    }),
  });
}
