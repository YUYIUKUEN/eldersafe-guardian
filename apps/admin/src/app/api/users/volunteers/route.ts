import { NextResponse } from "next/server";
import {
  adjustVolunteerPoints,
  approveVolunteer,
  listVolunteers,
  setVolunteerDisabled,
} from "@eldersafe/shared/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const result = requireAdmin(request);
  if ("error" in result && result.error) return result.error;
  const items = listVolunteers().map(({ passwordHash: _passwordHash, ...rest }) => rest);
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  const result = requireAdmin(request);
  if ("error" in result && result.error) return result.error;
  const admin = (result as { admin: { id: string } }).admin;
  const body = (await request.json()) as {
    id?: string;
    action?: "approve" | "disable" | "enable" | "points";
    points?: number;
  };
  if (!body.id || !body.action) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  try {
    if (body.action === "approve") {
      return NextResponse.json({ item: approveVolunteer(body.id, admin.id) });
    }
    if (body.action === "disable") {
      return NextResponse.json({
        item: setVolunteerDisabled(body.id, true, admin.id),
      });
    }
    if (body.action === "enable") {
      return NextResponse.json({
        item: setVolunteerDisabled(body.id, false, admin.id),
      });
    }
    if (body.action === "points" && typeof body.points === "number") {
      return NextResponse.json({
        item: adjustVolunteerPoints(body.id, body.points, admin.id),
      });
    }
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
}
