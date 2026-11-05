import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseServerKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "./config";

let cached: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }
  if (!cached) {
    cached = createClient(getSupabaseUrl(), getSupabaseServerKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
