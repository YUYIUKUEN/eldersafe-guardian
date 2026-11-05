export { locales, defaultLocale, type AppLocale } from "./i18n/locales";
export type {
  RequestStatus,
  ElderProfile,
  VolunteerProfile,
  HelpRequest,
  EmergencyEvent,
  ActivityLog,
} from "./types/database";
export { createSupabaseClient } from "./supabase/client";
export {
  isSupabaseConfigured,
  getSupabaseBrowserClient,
} from "./supabase/browser";
export {
  POINTS_PER_COMPLETED_REQUEST,
  canAwardPoints,
  calculateAwardPoints,
} from "./points/rules";
export { createLogger, type LogEntry, type LogLevel } from "./logger/index";
export { createId } from "./elder/id";
export type {
  StoredElderProfile,
  StoredHelpRequest,
  StoredEmergencyEvent,
} from "./elder/storage-types";
export {
  getOrCreateDeviceKey,
  getElderProfile,
  saveElderProfile,
  listHelpRequests,
  createHelpRequest,
  confirmHelpRequestComplete,
  markHelpRequestCompletedForDemo,
  createEmergencyEvent,
  updateEmergencyLocation,
  getEmergencyByToken,
} from "./elder/local-store";
