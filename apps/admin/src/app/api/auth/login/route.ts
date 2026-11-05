import { NextResponse } from "next/server";
import { createAdminSession, loginAdmin } from "@eldersafe/shared/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  try {
    const admin = await loginAdmin(body.email, body.password);
    const token = createAdminSession(admin.id);
    return NextResponse.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }
}
