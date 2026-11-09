export { locales, defaultLocale, type AppLocale } from "./i18n/locales";

export {
  getSupabaseAnonConfig,
  tryGetSupabaseAnonConfig,
  getSupabaseServiceRoleKey,
  tryGetSupabaseServiceRoleKey,
  getTestEmergencyNumber,
  isEmergencyTestMode,
  getEmergencyDialNumber,
  type SupabaseAnonConfig,
} from "./supabase/env";

export { ELDER_CONSENT_VERSION } from "./elder/consent";
export { generateDeviceKey, hashDeviceKey } from "./elder/device-key";
export {
  ElderActivityAction,
  type ActivityActorType,
  type ActivityLogInput,
} from "./elder/activity";
export type {
  ElderEmergencyContact,
  ElderProfileInput,
  ElderPublicProfile,
  ElderRegisterPayload,
} from "./elder/types";
export {
  decodeEmergencyContact,
  encodeEmergencyContact,
  isValidHkPhone,
  normalizeHkPhone,
  validateElderProfileInput,
  validateElderRegisterPayload,
  type ElderField,
  type ElderProfileInputLoose,
  type ElderValidationIssue,
} from "./elder/validation";
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

export {
  awardPointsForConfirmedHelpRequest,
  type AwardPointsInput,
  type AwardPointsResult,
} from "./points/award";
