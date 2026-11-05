import { NextResponse } from "next/server";
import { getAdmin, getAdminIdBySession } from "@eldersafe/shared/server";

export async function requireAdmin(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const adminId = getAdminIdBySession(token);
  if (!adminId) {
    return {
      error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }
  const admin = await getAdmin(adminId);
  if (!admin) {
    return {
      error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }
  return { admin };
}
