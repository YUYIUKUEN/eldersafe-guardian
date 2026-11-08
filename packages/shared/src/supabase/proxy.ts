import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonConfig } from "./env";

/**
 * Supabase client for Next.js 16 `proxy.ts` (formerly middleware).
 * Refreshes auth cookies onto both the request and the outgoing response.
 */
export function createSupabaseProxyClient(
  request: NextRequest,
  response: NextResponse,
) {
  const { url, anonKey } = getSupabaseAnonConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: CookieOptions;
        }[],
      ) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}
