export { locales, defaultLocale, type AppLocale } from "./i18n/locales";

export {
  getSupabaseAnonConfig,
  getSupabaseServiceRoleKey,
  getTestEmergencyNumber,
  type SupabaseAnonConfig,
} from "./supabase/env";
export { createSupabaseBrowserClient } from "./supabase/browser";
export {
  createSupabaseServerClient,
  type CookieAdapter,
} from "./supabase/server";
export { createSupabaseServiceClient } from "./supabase/service";
export { createSupabaseProxyClient } from "./supabase/proxy";

export type {
  ProfileRole,
  VolunteerApprovalStatus,
  AccessContext,
} from "./auth/types";
export { canAccessVolunteerApp, canAccessAdminApp } from "./auth/access";
export {
  isVolunteerPublicPath,
  isAdminPublicPath,
  volunteerLoginPath,
  adminLoginPath,
} from "./auth/paths";
export { loadAccessContext } from "./auth/session";
