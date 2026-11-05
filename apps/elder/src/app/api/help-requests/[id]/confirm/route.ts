import { NextResponse } from "next/server";
import { confirmHelpRequestByElder } from "@eldersafe/shared/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as { deviceKey?: string };
  if (!body.deviceKey) {
    return NextResponse.json({ error: "deviceKey required" }, { status: 400 });
  }
  try {
    const item = confirmHelpRequestByElder(id, body.deviceKey);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: 400 },
    );
  }
}
