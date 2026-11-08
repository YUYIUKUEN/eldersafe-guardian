import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonConfig } from "./env";

/** Browser / Client Component Supabase client (anon key). */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseAnonConfig();
  return createBrowserClient(url, anonKey);
}
