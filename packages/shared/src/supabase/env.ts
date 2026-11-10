export type SupabaseAnonConfig = {
  url: string;
  anonKey: string;
};

/**
 * Next.js only inlines NEXT_PUBLIC_* when accessed via static property paths
 * (process.env.NEXT_PUBLIC_FOO). Dynamic process.env[name] stays undefined in
 * the browser bundle and breaks client-side Supabase auth.
 */
function readPublic(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string | null {
  const value =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readOptionalServer(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function readRequiredPublic(
  name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY",
): string {
  const value = readPublic(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readRequiredServer(name: string): string {
  const value = readOptionalServer(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Returns null when public Supabase env is incomplete (useful in proxy gates). */
export function tryGetSupabaseAnonConfig(): SupabaseAnonConfig | null {
  const url = readPublic("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readPublic("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/** Public anon credentials (safe for browser + server user sessions). */
export function getSupabaseAnonConfig(): SupabaseAnonConfig {
  return {
    url: readRequiredPublic("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: readRequiredPublic("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

/** Server-only service role key (bypasses RLS). Never expose to the browser. */
export function getSupabaseServiceRoleKey(): string {
  return readRequiredServer("SUPABASE_SERVICE_ROLE_KEY");
}

/** Returns null when service-role env is incomplete (enables local fallbacks). */
export function tryGetSupabaseServiceRoleKey(): string | null {
  return readOptionalServer("SUPABASE_SERVICE_ROLE_KEY");
}

/** Fallback used when TEST_EMERGENCY_NUMBER is unset in test mode. */
const DEFAULT_TEST_EMERGENCY_NUMBER = "+85290000000";

export function getTestEmergencyNumber(): string {
  return readOptionalServer("TEST_EMERGENCY_NUMBER") ?? DEFAULT_TEST_EMERGENCY_NUMBER;
}

/**
 * Emergency dial safety switch.
 * Default is test mode (true). Only an explicit TEST_MODE=false enables 999.
 */
export function isEmergencyTestMode(): boolean {
  const mode = readOptionalServer("TEST_MODE");
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
