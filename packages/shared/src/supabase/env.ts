export type SupabaseAnonConfig = {
  url: string;
  anonKey: string;
};

function readRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Public anon credentials (safe for browser + server user sessions). */
export function getSupabaseAnonConfig(): SupabaseAnonConfig {
  return {
    url: readRequired("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: readRequired("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

/** Server-only service role key (bypasses RLS). Never expose to the browser. */
export function getSupabaseServiceRoleKey(): string {
  return readRequired("SUPABASE_SERVICE_ROLE_KEY");
}

export function getTestEmergencyNumber(): string {
  return readRequired("TEST_EMERGENCY_NUMBER");
}
