import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseAnonConfig } from "./env";

export type CookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: { name: string; value: string; options?: CookieOptions }[],
  ) => void;
};

/** Server Component / Route Handler client. Pass Next.js cookies() adapter. */
export function createSupabaseServerClient(cookies: CookieAdapter) {
  const { url, anonKey } = getSupabaseAnonConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet) => cookies.setAll(toSet),
    },
  });
}
