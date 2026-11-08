export type SupabaseAnonConfig = {
  url: string;
  anonKey: string;
};

function readOptional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function readRequired(name: string): string {
  const value = readOptional(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Returns null when public Supabase env is incomplete (useful in proxy gates). */
export function tryGetSupabaseAnonConfig(): SupabaseAnonConfig | null {
  const url = readOptional("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readOptional("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  return { url, anonKey };
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
