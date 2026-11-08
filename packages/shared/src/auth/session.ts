import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessContext, ProfileRole, VolunteerApprovalStatus } from "./types";

type ProfileRow = { role: ProfileRole };
type VolunteerRow = { approval_status: VolunteerApprovalStatus };

/** Load role (+ volunteer approval) for the current Auth user. */
export async function loadAccessContext(
  supabase: SupabaseClient,
  userId: string | null | undefined,
): Promise<AccessContext> {
  if (!userId) {
    return { userId: null, role: null, approvalStatus: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (!profile) {
    return { userId, role: null, approvalStatus: null };
  }

  if (profile.role !== "volunteer") {
    return { userId, role: profile.role, approvalStatus: null };
  }

  const { data: volunteer } = await supabase
    .from("volunteers")
    .select("approval_status")
    .eq("id", userId)
    .maybeSingle<VolunteerRow>();

  return {
    userId,
    role: profile.role,
    approvalStatus: volunteer?.approval_status ?? null,
  };
}
