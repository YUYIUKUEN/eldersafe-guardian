import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const result = requireAdmin(request);
  if ("error" in result && result.error) return result.error;
  const { admin } = result as { admin: { id: string; name: string; email: string } };
  return NextResponse.json({
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
}
