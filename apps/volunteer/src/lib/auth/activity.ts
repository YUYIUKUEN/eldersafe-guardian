"use client";

import { VolunteerActivityAction } from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/browser";

export async function logVolunteerActivity(input: {
  action: (typeof VolunteerActivityAction)[keyof typeof VolunteerActivityAction];
  userId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createClient();
    await supabase.from("activity_logs").insert({
      actor_type: "volunteer",
      actor_id: input.userId,
      action: input.action,
      target_type: "volunteer",
      target_id: input.userId,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Logging must not block auth UX.
  }
}
