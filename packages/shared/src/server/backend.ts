/**
 * Async backend facade.
 * Uses Supabase when configured; otherwise falls back to local file-store.
 */
import { isSupabaseConfigured } from "../supabase/config";
import * as local from "./file-store";
import * as sb from "./supabase-store";
import type {
  SharedActivityLog,
  SharedAdmin,
  SharedElder,
  SharedEmergency,
  SharedHelpRequest,
  SharedVolunteer,
} from "./store-types";

export {
  createAdminSession,
  createVolunteerSession,
  clearAdminSession,
  clearVolunteerSession,
  getAdminIdBySession,
  getVolunteerIdBySession,
  hashPassword,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  POINTS_PER_COMPLETED_REQUEST,
} from "./file-store";

function useCloud() {
  return isSupabaseConfigured();
}

export async function upsertElder(
  input: Omit<SharedElder, "updatedAt">,
): Promise<SharedElder> {
  return useCloud() ? sb.sbUpsertElder(input) : local.upsertElder(input);
}

export async function listElders(): Promise<SharedElder[]> {
  return useCloud() ? sb.sbListElders() : local.listElders();
}

export async function setElderDisabled(
  deviceKey: string,
  disabled: boolean,
): Promise<SharedElder> {
  return useCloud()
    ? sb.sbSetElderDisabled(deviceKey, disabled)
    : local.setElderDisabled(deviceKey, disabled);
}

export async function createHelpRequestRecord(
  input: Omit<SharedHelpRequest, "id" | "status" | "createdAt">,
): Promise<SharedHelpRequest> {
  return useCloud()
    ? sb.sbCreateHelpRequest(input)
    : local.createHelpRequestRecord(input);
}

export async function listHelpRequests(filter?: {
  deviceKey?: string;
  volunteerId?: string;
}): Promise<SharedHelpRequest[]> {
  return useCloud()
    ? sb.sbListHelpRequests(filter)
    : local.listHelpRequests(filter);
}

export async function acceptHelpRequest(
  requestId: string,
  volunteerId: string,
): Promise<SharedHelpRequest> {
  return useCloud()
    ? sb.sbAcceptHelpRequest(requestId, volunteerId)
    : local.acceptHelpRequest(requestId, volunteerId);
}

export async function completeHelpRequest(
  requestId: string,
  volunteerId: string,
): Promise<SharedHelpRequest> {
  return useCloud()
    ? sb.sbCompleteHelpRequest(requestId, volunteerId)
    : local.completeHelpRequest(requestId, volunteerId);
}

export async function confirmHelpRequestByElder(
  requestId: string,
  deviceKey: string,
): Promise<SharedHelpRequest> {
  return useCloud()
    ? sb.sbConfirmHelpRequestByElder(requestId, deviceKey)
    : local.confirmHelpRequestByElder(requestId, deviceKey);
}

export async function registerVolunteer(input: {
  name: string;
  phone: string;
  email: string;
  password: string;
  age: number;
  serviceAreas: string[];
  bio: string;
}): Promise<SharedVolunteer> {
  return useCloud()
    ? sb.sbRegisterVolunteer(input)
    : local.registerVolunteer(input);
}

export async function loginVolunteer(
  email: string,
  password: string,
): Promise<SharedVolunteer> {
  return useCloud()
    ? sb.sbLoginVolunteer(email, password)
    : local.loginVolunteer(email, password);
}

export async function getVolunteer(
  id: string,
): Promise<SharedVolunteer | null> {
  return useCloud() ? sb.sbGetVolunteer(id) : local.getVolunteer(id);
}

export async function listVolunteers(): Promise<SharedVolunteer[]> {
  return useCloud() ? sb.sbListVolunteers() : local.listVolunteers();
}

export async function approveVolunteer(
  id: string,
  adminId?: string,
): Promise<SharedVolunteer> {
  return useCloud()
    ? sb.sbApproveVolunteer(id, adminId)
    : local.approveVolunteer(id, adminId);
}

export async function setVolunteerDisabled(
  id: string,
  disabled: boolean,
  adminId?: string,
): Promise<SharedVolunteer> {
  return useCloud()
    ? sb.sbSetVolunteerDisabled(id, disabled, adminId)
    : local.setVolunteerDisabled(id, disabled, adminId);
}

export async function adjustVolunteerPoints(
  id: string,
  points: number,
  adminId?: string,
): Promise<SharedVolunteer> {
  return useCloud()
    ? sb.sbAdjustVolunteerPoints(id, points, adminId)
    : local.adjustVolunteerPoints(id, points, adminId);
}

export async function listLeaderboard(
  month?: string,
): Promise<Array<{ id: string; name: string; points: number }>> {
  if (month) {
    return useCloud()
      ? sb.sbListMonthlyLeaderboard(month)
      : local.listMonthlyLeaderboard(month);
  }
  return useCloud() ? sb.sbListLeaderboard() : local.listLeaderboard();
}

export async function listMonthlyLeaderboard(
  month?: string,
): Promise<Array<{ id: string; name: string; points: number }>> {
  return useCloud()
    ? sb.sbListMonthlyLeaderboard(month)
    : local.listMonthlyLeaderboard(month);
}

export async function createEmergencyRecord(input: {
  deviceKey: string;
  elderName: string;
  latitude?: number;
  longitude?: number;
  locationUpdatedAt?: string;
  policeShareToken?: string;
}): Promise<SharedEmergency> {
  return useCloud()
    ? sb.sbCreateEmergency(input)
    : local.createEmergencyRecord(input);
}

export async function updateEmergencyByToken(
  token: string,
  latitude: number,
  longitude: number,
): Promise<SharedEmergency | null> {
  return useCloud()
    ? sb.sbUpdateEmergencyByToken(token, latitude, longitude)
    : local.updateEmergencyByToken(token, latitude, longitude);
}

export async function getEmergencyByToken(
  token: string,
): Promise<SharedEmergency | null> {
  return useCloud()
    ? sb.sbGetEmergencyByToken(token)
    : local.getEmergencyByToken(token);
}

export async function listEmergencies(): Promise<SharedEmergency[]> {
  return useCloud() ? sb.sbListEmergencies() : local.listEmergencies();
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<SharedAdmin> {
  return useCloud()
    ? sb.sbLoginAdmin(email, password)
    : local.loginAdmin(email, password);
}

export async function getAdmin(id: string): Promise<SharedAdmin | null> {
  return useCloud() ? sb.sbGetAdmin(id) : local.getAdmin(id);
}

export async function listActivityLogs(filter?: {
  actorType?: SharedActivityLog["actorType"];
  action?: string;
}): Promise<SharedActivityLog[]> {
  return useCloud()
    ? sb.sbListActivityLogs(filter)
    : local.listActivityLogs(filter);
}

export async function getActivitySummary() {
  return useCloud() ? sb.sbGetActivitySummary() : local.getActivitySummary();
}

export async function listPairings() {
  return useCloud() ? sb.sbListPairings() : local.listPairings();
}

export async function uploadRecording(
  deviceKey: string,
  bytes: ArrayBuffer,
  contentType?: string,
): Promise<{ path: string; publicUrl: string } | null> {
  if (!useCloud()) return null;
  return sb.sbUploadRecording(deviceKey, bytes, contentType);
}

export function backendMode(): "supabase" | "local" {
  return useCloud() ? "supabase" : "local";
}
