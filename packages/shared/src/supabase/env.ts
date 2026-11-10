export type SupabaseAnonConfig = {
  url: string;
  anonKey: string;
};

function trimEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Next.js only inlines NEXT_PUBLIC_* into client bundles for *static*
 * `process.env.NEXT_PUBLIC_FOO` access. Dynamic `process.env[name]` stays
 * undefined in the browser and crashes client Supabase helpers.
 */
function readPublicUrl(): string | null {
  return trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function readPublicAnonKey(): string | null {
  return trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function readServiceRoleKey(): string | null {
  return trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function readTestMode(): string | null {
  return trimEnv(process.env.TEST_MODE);
}

function readTestEmergencyNumberEnv(): string | null {
  return trimEnv(process.env.TEST_EMERGENCY_NUMBER);
}

function requireValue(name: string, value: string | null): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Returns null when public Supabase env is incomplete (useful in proxy gates). */
export function tryGetSupabaseAnonConfig(): SupabaseAnonConfig | null {
  const url = readPublicUrl();
  const anonKey = readPublicAnonKey();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/** Public anon credentials (safe for browser + server user sessions). */
export function getSupabaseAnonConfig(): SupabaseAnonConfig {
  return {
    url: requireValue("NEXT_PUBLIC_SUPABASE_URL", readPublicUrl()),
    anonKey: requireValue(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      readPublicAnonKey(),
    ),
  };
}

/** Server-only service role key (bypasses RLS). Never expose to the browser. */
export function getSupabaseServiceRoleKey(): string {
  return requireValue("SUPABASE_SERVICE_ROLE_KEY", readServiceRoleKey());
}

/** Returns null when service-role env is incomplete (enables local fallbacks). */
export function tryGetSupabaseServiceRoleKey(): string | null {
  return readServiceRoleKey();
}

/** Fallback used when TEST_EMERGENCY_NUMBER is unset in test mode. */
const DEFAULT_TEST_EMERGENCY_NUMBER = "+85290000000";

export function getTestEmergencyNumber(): string {
  return readTestEmergencyNumberEnv() ?? DEFAULT_TEST_EMERGENCY_NUMBER;
}

/**
 * Emergency dial safety switch.
 * Default is test mode (true). Only an explicit TEST_MODE=false enables 999.
 */
export function isEmergencyTestMode(): boolean {
  const mode = readTestMode();
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
