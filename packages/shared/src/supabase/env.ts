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

/** Returns null when service-role env is incomplete (enables local fallbacks). */
export function tryGetSupabaseServiceRoleKey(): string | null {
  return readOptional("SUPABASE_SERVICE_ROLE_KEY");
}

/** Fallback used when TEST_EMERGENCY_NUMBER is unset in test mode. */
const DEFAULT_TEST_EMERGENCY_NUMBER = "+85290000000";

export function getTestEmergencyNumber(): string {
  return readOptional("TEST_EMERGENCY_NUMBER") ?? DEFAULT_TEST_EMERGENCY_NUMBER;
}

/**
 * Emergency dial safety switch.
 * Default is test mode (true). Only an explicit TEST_MODE=false enables 999.
 */
export function isEmergencyTestMode(): boolean {
  const mode = readOptional("TEST_MODE");
  if (mode == null) return true;
  return mode.toLowerCase() !== "false";
}

/** Number passed to tel: links. Never returns 999 while test mode is on. */
export function getEmergencyDialNumber(): string {
  if (isEmergencyTestMode()) {
    const number = getTestEmergencyNumber();
    if (number.replace(/\D/g, "") === "999") {
      throw new Error(
        "TEST_EMERGENCY_NUMBER must not be 999 while TEST_MODE is enabled",
      );
    }
    return number;
  }
  return "999";
}
