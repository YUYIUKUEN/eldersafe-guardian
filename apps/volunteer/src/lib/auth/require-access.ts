import {
  canAccessVolunteerApp,
  isBlockedVolunteer,
  isPendingVolunteer,
  loadAccessContext,
  volunteerBlockedPath,
  volunteerDestinationForAccess,
  volunteerLoginPath,
  volunteerPendingPath,
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

export async function requireVolunteerSession(): Promise<{
  access: AccessContext;
  userId: string;
  email: string | null;
}> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return await redirectTo(volunteerLoginPath());
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return await redirectTo(volunteerLoginPath());
  }

  const access = await loadAccessContext(supabase, user.id);
  return { access, userId: user.id, email: user.email ?? null };
}

/** Server guard for pages that only pending volunteers may see. */
export async function requirePendingVolunteer() {
  const result = await requireVolunteerSession();
  if (!isPendingVolunteer(result.access)) {
    return await redirectTo(volunteerDestinationForAccess(result.access));
  }
  return result;
}

/** Server guard for rejected / disabled status page. */
export async function requireBlockedVolunteer() {
  const result = await requireVolunteerSession();
  if (!isBlockedVolunteer(result.access)) {
    return await redirectTo(volunteerDestinationForAccess(result.access));
  }
  return result;
}

/** Server guard for approved volunteer app pages (home, profile). */
export async function requireApprovedVolunteer() {
  const result = await requireVolunteerSession();
  if (canAccessVolunteerApp(result.access)) {
    return result;
  }
  if (isPendingVolunteer(result.access)) {
    return await redirectTo(volunteerPendingPath());
  }
  if (isBlockedVolunteer(result.access)) {
    return await redirectTo(volunteerBlockedPath());
  }
  return await redirectTo(volunteerLoginPath());
}
