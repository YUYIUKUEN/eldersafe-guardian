import { createId } from "./id";
import type {
  StoredElderProfile,
  StoredEmergencyEvent,
  StoredHelpRequest,
} from "./storage-types";

const PROFILE_KEY = "eldersafe.elder.profile";
const REQUESTS_KEY = "eldersafe.elder.helpRequests";
const EMERGENCIES_KEY = "eldersafe.elder.emergencies";
const DEVICE_KEY = "eldersafe.elder.deviceKey";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getOrCreateDeviceKey(): string {
  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const key = createId("device");
  window.localStorage.setItem(DEVICE_KEY, key);
  return key;
}

export function getElderProfile(): StoredElderProfile | null {
  return readJson<StoredElderProfile | null>(PROFILE_KEY, null);
}

export function saveElderProfile(
  input: Omit<StoredElderProfile, "deviceKey" | "createdAt"> & {
    deviceKey?: string;
  },
): StoredElderProfile {
  const profile: StoredElderProfile = {
    deviceKey: input.deviceKey ?? getOrCreateDeviceKey(),
    name: input.name.trim(),
    age: input.age,
    phone: input.phone.trim(),
    address: input.address.trim(),
    emergencyContact: input.emergencyContact.trim(),
    healthNotes: input.healthNotes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  writeJson(PROFILE_KEY, profile);
  return profile;
}

export function listHelpRequests(deviceKey: string): StoredHelpRequest[] {
  const all = readJson<StoredHelpRequest[]>(REQUESTS_KEY, []);
  return all
    .filter((item) => item.deviceKey === deviceKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createHelpRequest(input: {
  deviceKey: string;
  audioDataUrl: string;
  latitude?: number;
  longitude?: number;
}): StoredHelpRequest {
  const request: StoredHelpRequest = {
    id: createId("help"),
    deviceKey: input.deviceKey,
    status: "pending",
    audioDataUrl: input.audioDataUrl,
    latitude: input.latitude,
    longitude: input.longitude,
    createdAt: new Date().toISOString(),
  };
  const all = readJson<StoredHelpRequest[]>(REQUESTS_KEY, []);
  all.unshift(request);
  writeJson(REQUESTS_KEY, all);
  return request;
}

export function confirmHelpRequestComplete(
  requestId: string,
  deviceKey: string,
): StoredHelpRequest | null {
  const all = readJson<StoredHelpRequest[]>(REQUESTS_KEY, []);
  const index = all.findIndex(
    (item) => item.id === requestId && item.deviceKey === deviceKey,
  );
  if (index < 0) return null;
  if (all[index].status !== "completed") return null;
  all[index] = {
    ...all[index],
    elderConfirmedAt: new Date().toISOString(),
  };
  writeJson(REQUESTS_KEY, all);
  return all[index];
}

/** Demo helper until volunteer app can mark completion. */
export function markHelpRequestCompletedForDemo(
  requestId: string,
  deviceKey: string,
): StoredHelpRequest | null {
  const all = readJson<StoredHelpRequest[]>(REQUESTS_KEY, []);
  const index = all.findIndex(
    (item) => item.id === requestId && item.deviceKey === deviceKey,
  );
  if (index < 0) return null;
  all[index] = {
    ...all[index],
    status: "completed",
    completedAt: new Date().toISOString(),
  };
  writeJson(REQUESTS_KEY, all);
  return all[index];
}

export function createEmergencyEvent(input: {
  deviceKey: string;
  elderName: string;
  latitude?: number;
  longitude?: number;
}): StoredEmergencyEvent {
  const event: StoredEmergencyEvent = {
    id: createId("emergency"),
    deviceKey: input.deviceKey,
    policeShareToken: createId("police"),
    elderName: input.elderName,
    latitude: input.latitude,
    longitude: input.longitude,
    locationUpdatedAt: input.latitude != null ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
    notifiedAdmin: true,
  };
  const all = readJson<StoredEmergencyEvent[]>(EMERGENCIES_KEY, []);
  all.unshift(event);
  writeJson(EMERGENCIES_KEY, all);
  return event;
}

export function updateEmergencyLocation(
  token: string,
  latitude: number,
  longitude: number,
): StoredEmergencyEvent | null {
  const all = readJson<StoredEmergencyEvent[]>(EMERGENCIES_KEY, []);
  const index = all.findIndex((item) => item.policeShareToken === token);
  if (index < 0) return null;
  all[index] = {
    ...all[index],
    latitude,
    longitude,
    locationUpdatedAt: new Date().toISOString(),
  };
  writeJson(EMERGENCIES_KEY, all);
  return all[index];
}

export function getEmergencyByToken(
  token: string,
): StoredEmergencyEvent | null {
  const all = readJson<StoredEmergencyEvent[]>(EMERGENCIES_KEY, []);
  return all.find((item) => item.policeShareToken === token) ?? null;
}
