import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared Supabase browser/server-agnostic client factory.
 * Each app should provide URL + anon key via its own .env.local.
 */
export function createSupabaseClient(
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local.",
    );
  }

  return createClient(url, anonKey);
}
