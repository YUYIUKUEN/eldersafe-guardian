import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonConfig, getSupabaseServiceRoleKey } from "./env";

/** Service-role client for trusted server paths (elder device flows, health). */
export function createSupabaseServiceClient() {
  const { url } = getSupabaseAnonConfig();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
