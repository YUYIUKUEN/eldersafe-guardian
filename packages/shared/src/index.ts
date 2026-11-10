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
export {
  canAccessVolunteerApp,
  canAccessAdminApp,
  isPendingVolunteer,
  isBlockedVolunteer,
  volunteerDestinationForAccess,
  adminDestinationForAccess,
} from "./auth/access";
export {
  isVolunteerPublicPath,
  isVolunteerPendingPath,
  isVolunteerBlockedPath,
  isAdminPublicPath,
  isAdminUnauthorizedPath,
  volunteerLoginPath,
  volunteerPendingPath,
  volunteerBlockedPath,
  adminLoginPath,
  adminUnauthorizedPath,
} from "./auth/paths";
export { loadAccessContext } from "./auth/session";

export {
  AdminActivityAction,
  type AdminActivityActionName,
} from "./admin/activity";

export type {
  VolunteerRegisterInput,
  VolunteerRegisterInputLoose,
  VolunteerProfileInput,
  VolunteerProfileInputLoose,
  PasswordStrength,
} from "./volunteer/types";
export {
  VolunteerActivityAction,
  type VolunteerActivityActionName,
} from "./volunteer/activity";
export {
  scorePasswordStrength,
  isPasswordAcceptable,
  VOLUNTEER_PASSWORD_MIN_LENGTH,
} from "./volunteer/password";
export {
  validateVolunteerRegisterInput,
  validateVolunteerProfileInput,
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  type VolunteerField,
  type VolunteerValidationIssue,
} from "./volunteer/validation";
export {
  mapVolunteerHelpFeedRow,
  filterVolunteerHelpFeed,
  isAwaitingElderConfirm,
  volunteerDisplayStatus,
  serviceHoursBetween,
  buildVolunteerRecordsSummary,
  type VolunteerHelpFeedStatus,
  type VolunteerHelpFeedItem,
  type VolunteerHelpFeedFilter,
  type VolunteerHelpFeedSort,
  type VolunteerDisplayStatus,
  type VolunteerRecordsSummary,
} from "./volunteer/help-feed";
export {
  buildMapNavigationUrl,
  type MapNavigationTarget,
} from "./geo/navigation";
export {
  haversineDistanceMeters,
  formatDistanceMeters,
} from "./geo/haversine";

export { POINTS_RULES, type PointsRules } from "./points/rules";
export {
  calculatePointsAward,
  normalizeElderRating,
  type CalculatePointsInput,
  type CalculatePointsResult,
  type PointsBreakdown,
} from "./points/calculate";
export {
  awardPointsForConfirmedHelpRequest,
  confirmHelpRequestWithPoints,
  listMemoryPointsForVolunteer,
  type AwardPointsInput,
  type AwardPointsResult,
  type ConfirmWithPointsInput,
  type ConfirmWithPointsResult,
} from "./points/award";
export {
  formatLeaderboardDisplayName,
  getMonthCountdown,
  hongKongMonthEnd,
  hongKongYearMonth,
  leaderboardSurname,
  mapLeaderboardRows,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type MonthCountdown,
} from "./points/leaderboard";
export {
  CERTIFICATE_DEFAULTS,
  getCertificateOrgName,
  type CertificatePdfInput,
} from "./certificates/config";
export {
  applyPodiumDecision,
  isValidYearMonth,
  mapMonthlyLeaderboardRows,
  resolvePodium,
  validatePodiumSelection,
  type PodiumResolution,
  type RankedVolunteer,
} from "./certificates/ranking";
// generateCertificatePdf uses node:fs — import from
// "@eldersafe/shared/certificates/pdf" in server-only modules only.
export {
  CERTIFICATES_BUCKET,
  certificateObjectPath,
} from "./certificates/storage";
export {
  clientKeyFromRequest,
  consumeRateLimit,
} from "./security/rate-limit";
export { toSafeErrorCode } from "./security/safe-error";
