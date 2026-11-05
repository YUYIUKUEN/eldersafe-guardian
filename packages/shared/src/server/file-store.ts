import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createId } from "../elder/id";
import {
  calculateAwardPoints,
  POINTS_PER_COMPLETED_REQUEST,
} from "../points/rules";
import type {
  SharedElder,
  SharedEmergency,
  SharedHelpRequest,
  SharedStoreData,
  SharedVolunteer,
} from "./store-types";

const EMPTY: SharedStoreData = {
  elders: [],
  volunteers: [],
  helpRequests: [],
  emergencies: [],
};

function getStorePath() {
  // apps/<name> -> repo root /.data/store.json
  return path.resolve(process.cwd(), "../../.data/store.json");
}

function ensureStore(): SharedStoreData {
  const filePath = getStorePath();
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(EMPTY, null, 2), "utf8");
    return structuredClone(EMPTY);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as SharedStoreData;
  } catch {
    return structuredClone(EMPTY);
  }
}

function saveStore(data: SharedStoreData) {
  const filePath = getStorePath();
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(24).toString("hex");
}

/** In-memory session map for local demo (resets when server restarts). */
const sessions = new Map<string, string>(); // token -> volunteerId

export function createVolunteerSession(volunteerId: string): string {
  const token = createSessionToken();
  sessions.set(token, volunteerId);
  return token;
}

export function getVolunteerIdBySession(token?: string | null): string | null {
  if (!token) return null;
  return sessions.get(token) ?? null;
}

export function clearVolunteerSession(token?: string | null) {
  if (token) sessions.delete(token);
}

export function upsertElder(input: Omit<SharedElder, "updatedAt">): SharedElder {
  const store = ensureStore();
  const updated: SharedElder = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  const index = store.elders.findIndex((item) => item.deviceKey === input.deviceKey);
  if (index >= 0) store.elders[index] = updated;
  else store.elders.push(updated);
  saveStore(store);
  return updated;
}

export function createHelpRequestRecord(
  input: Omit<SharedHelpRequest, "id" | "status" | "createdAt">,
): SharedHelpRequest {
  const store = ensureStore();
  const record: SharedHelpRequest = {
    id: createId("help"),
    status: "pending",
    createdAt: new Date().toISOString(),
    ...input,
  };
  store.helpRequests.unshift(record);
  saveStore(store);
  return record;
}

export function listHelpRequests(filter?: {
  deviceKey?: string;
  volunteerId?: string;
}): SharedHelpRequest[] {
  const store = ensureStore();
  return store.helpRequests
    .filter((item) => {
      if (filter?.deviceKey && item.deviceKey !== filter.deviceKey) return false;
      if (filter?.volunteerId && item.volunteerId !== filter.volunteerId)
        return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getHelpRequest(id: string): SharedHelpRequest | null {
  return ensureStore().helpRequests.find((item) => item.id === id) ?? null;
}

export function acceptHelpRequest(
  requestId: string,
  volunteerId: string,
): SharedHelpRequest {
  const store = ensureStore();
  const volunteer = store.volunteers.find((item) => item.id === volunteerId);
  if (!volunteer || !volunteer.approved || volunteer.disabled) {
    throw new Error("VOLUNTEER_NOT_ALLOWED");
  }
  const index = store.helpRequests.findIndex((item) => item.id === requestId);
  if (index < 0) throw new Error("NOT_FOUND");
  if (store.helpRequests[index].status !== "pending") {
    throw new Error("NOT_PENDING");
  }
  store.helpRequests[index] = {
    ...store.helpRequests[index],
    status: "accepted",
    volunteerId,
  };
  saveStore(store);
  return store.helpRequests[index];
}

export function completeHelpRequest(
  requestId: string,
  volunteerId: string,
): SharedHelpRequest {
  const store = ensureStore();
  const index = store.helpRequests.findIndex((item) => item.id === requestId);
  if (index < 0) throw new Error("NOT_FOUND");
  const request = store.helpRequests[index];
  if (request.volunteerId !== volunteerId) throw new Error("FORBIDDEN");
  if (request.status !== "accepted") throw new Error("NOT_ACCEPTED");
  store.helpRequests[index] = {
    ...request,
    status: "completed",
    completedAt: new Date().toISOString(),
  };
  saveStore(store);
  return store.helpRequests[index];
}

export function confirmHelpRequestByElder(
  requestId: string,
  deviceKey: string,
): SharedHelpRequest {
  const store = ensureStore();
  const index = store.helpRequests.findIndex((item) => item.id === requestId);
  if (index < 0) throw new Error("NOT_FOUND");
  const request = store.helpRequests[index];
  if (request.deviceKey !== deviceKey) throw new Error("FORBIDDEN");
  if (request.status !== "completed") throw new Error("NOT_COMPLETED");
  if (request.elderConfirmedAt) return request;

  store.helpRequests[index] = {
    ...request,
    elderConfirmedAt: new Date().toISOString(),
  };

  if (request.volunteerId) {
    const volunteerIndex = store.volunteers.findIndex(
      (item) => item.id === request.volunteerId,
    );
    if (volunteerIndex >= 0) {
      const award = calculateAwardPoints({
        requestStatus: "completed",
        elderConfirmed: true,
      });
      store.volunteers[volunteerIndex] = {
        ...store.volunteers[volunteerIndex],
        points: store.volunteers[volunteerIndex].points + award,
      };
    }
  }

  saveStore(store);
  return store.helpRequests[index];
}

export function registerVolunteer(input: {
  name: string;
  phone: string;
  email: string;
  password: string;
  age: number;
  serviceAreas: string[];
  bio: string;
}): SharedVolunteer {
  const store = ensureStore();
  const email = input.email.trim().toLowerCase();
  if (store.volunteers.some((item) => item.email === email)) {
    throw new Error("EMAIL_EXISTS");
  }
  const volunteer: SharedVolunteer = {
    id: createId("volunteer"),
    name: input.name.trim(),
    phone: input.phone.trim(),
    email,
    passwordHash: hashPassword(input.password),
    age: input.age,
    serviceAreas: input.serviceAreas,
    bio: input.bio.trim(),
    approved: false,
    disabled: false,
    points: 0,
    createdAt: new Date().toISOString(),
  };
  store.volunteers.push(volunteer);
  saveStore(store);
  return volunteer;
}

export function loginVolunteer(
  email: string,
  password: string,
): SharedVolunteer {
  const store = ensureStore();
  const volunteer = store.volunteers.find(
    (item) => item.email === email.trim().toLowerCase(),
  );
  if (!volunteer || volunteer.passwordHash !== hashPassword(password)) {
    throw new Error("INVALID_CREDENTIALS");
  }
  if (volunteer.disabled) throw new Error("DISABLED");
  return volunteer;
}

export function getVolunteer(id: string): SharedVolunteer | null {
  return ensureStore().volunteers.find((item) => item.id === id) ?? null;
}

export function approveVolunteer(id: string): SharedVolunteer {
  const store = ensureStore();
  const index = store.volunteers.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("NOT_FOUND");
  store.volunteers[index] = { ...store.volunteers[index], approved: true };
  saveStore(store);
  return store.volunteers[index];
}

export function listLeaderboard(month?: string): Array<{
  id: string;
  name: string;
  points: number;
}> {
  // Local demo: overall points. Monthly filtering comes with Stage 5 schema.
  void month;
  return ensureStore()
    .volunteers.filter((item) => item.approved && !item.disabled)
    .map((item) => ({ id: item.id, name: item.name, points: item.points }))
    .sort((a, b) => b.points - a.points);
}

export function createEmergencyRecord(
  input: Omit<SharedEmergency, "id" | "createdAt" | "notifiedAdmin" | "policeShareToken"> & {
    policeShareToken?: string;
  },
): SharedEmergency {
  const store = ensureStore();
  const record: SharedEmergency = {
    id: createId("emergency"),
    policeShareToken: input.policeShareToken ?? createId("police"),
    deviceKey: input.deviceKey,
    elderName: input.elderName,
    latitude: input.latitude,
    longitude: input.longitude,
    locationUpdatedAt: input.locationUpdatedAt,
    createdAt: new Date().toISOString(),
    notifiedAdmin: true,
  };
  store.emergencies.unshift(record);
  saveStore(store);
  return record;
}

export function updateEmergencyByToken(
  token: string,
  latitude: number,
  longitude: number,
): SharedEmergency | null {
  const store = ensureStore();
  const index = store.emergencies.findIndex(
    (item) => item.policeShareToken === token,
  );
  if (index < 0) return null;
  store.emergencies[index] = {
    ...store.emergencies[index],
    latitude,
    longitude,
    locationUpdatedAt: new Date().toISOString(),
  };
  saveStore(store);
  return store.emergencies[index];
}

export function getEmergencyByToken(
  token: string,
): SharedEmergency | null {
  return (
    ensureStore().emergencies.find((item) => item.policeShareToken === token) ??
    null
  );
}

export { POINTS_PER_COMPLETED_REQUEST };
