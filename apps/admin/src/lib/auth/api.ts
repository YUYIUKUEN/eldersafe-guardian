import {
  canAccessAdminApp,
  createSupabaseServiceClient,
  loadAccessContext,
} from "@eldersafe/shared";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AdminApiContext = {
  user: User;
  supabase: SupabaseClient;
  service: SupabaseClient;
};

export async function requireAdminApi(): Promise<
  | { ok: true; ctx: AdminApiContext }
  | { ok: false; response: Response }
> {
  let supabase: SupabaseClient;
  try {
    supabase = await createClient();
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "supabase_not_configured" },
        { status: 503 },
      ),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const access = await loadAccessContext(supabase, user.id);
  if (!canAccessAdminApp(access)) {
    return {
      ok: false,
      response: Response.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  let service: SupabaseClient;
  try {
    service = createSupabaseServiceClient();
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "supabase_not_configured" },
        { status: 503 },
      ),
    };
  }

  return { ok: true, ctx: { user, supabase, service } };
}

export function parsePositiveInt(
  value: string | null,
  fallback: number,
  max = 100,
) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, max);
}
