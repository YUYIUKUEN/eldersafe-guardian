"use client";

import { AdminActivityAction } from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/browser";

export async function logAdminActivity(input: {
  action: (typeof AdminActivityAction)[keyof typeof AdminActivityAction];
  userId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createClient();
    await supabase.from("activity_logs").insert({
      actor_type: "admin",
      actor_id: input.userId,
      action: input.action,
      target_type: "admin",
      target_id: input.userId,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Logging must not block auth UX.
  }
}
