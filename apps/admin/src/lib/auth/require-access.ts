import {
  adminLoginPath,
  adminUnauthorizedPath,
  canAccessAdminApp,
  loadAccessContext,
  type AccessContext,
} from "@eldersafe/shared";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

async function redirectTo(href: string): Promise<never> {
  const locale = await getLocale();
  redirect({ href, locale });
  throw new Error(`redirect_failed:${href}`);
}

export async function requireAdminSession(): Promise<{
  access: AccessContext;
  userId: string;
  email: string | null;
}> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return await redirectTo(adminLoginPath());
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return await redirectTo(adminLoginPath());
  }

  const access = await loadAccessContext(supabase, user.id);
  if (!canAccessAdminApp(access)) {
    return await redirectTo(adminUnauthorizedPath());
  }

  return { access, userId: user.id, email: user.email ?? null };
}
