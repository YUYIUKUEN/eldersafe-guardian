import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createId } from "../elder/id";
import { calculateAwardPoints, POINTS_PER_COMPLETED_REQUEST } from "../points/rules";
import type {
  SharedActivityLog,
  SharedAdmin,
  SharedElder,
  SharedEmergency,
  SharedHelpRequest,
  SharedStoreData,
  SharedVolunteer,
} from "./store-types";

const EMPTY: SharedStoreData = {
  elders: [],
  volunteers: [],
  admins: [],
  helpRequests: [],
  emergencies: [],
  logs: [],
};

const DEFAULT_ADMIN_EMAIL = "admin@eldersafe.local";
const DEFAULT_ADMIN_PASSWORD = "admin123";

function getStorePath() {
  return path.resolve(process.cwd(), "../../.data/store.json");
}

function normalizeStore(raw: Partial<SharedStoreData>): SharedStoreData {
  return {
    elders: raw.elders ?? [],
    volunteers: raw.volunteers ?? [],
    admins: raw.admins ?? [],
    helpRequests: raw.helpRequests ?? [],
    emergencies: raw.emergencies ?? [],
    logs: raw.logs ?? [],
  };
}

function ensureStore(): SharedStoreData {
  const filePath = getStorePath();
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(filePath)) {
    const initial = structuredClone(EMPTY);
    seedDefaultAdmin(initial);
    writeFileSync(filePath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const data = normalizeStore(
      JSON.parse(readFileSync(filePath, "utf8")) as Partial<SharedStoreData>,
    );
    if (data.admins.length === 0) {
      seedDefaultAdmin(data);
      saveStore(data);
    }
    return data;
  } catch {
    const fallback = structuredClone(EMPTY);
    seedDefaultAdmin(fallback);
    return fallback;
  }
}

function saveStore(data: SharedStoreData) {
  const filePath = getStorePath();
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function seedDefaultAdmin(store: SharedStoreData) {
  store.admins.push({
    id: createId("admin"),
    name: "System Admin",
    email: DEFAULT_ADMIN_EMAIL,
    passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    createdAt: new Date().toISOString(),
  });
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(24).toString("hex");
}

const volunteerSessions = new Map<string, string>();
const adminSessions = new Map<string, string>();

export function createVolunteerSession(volunteerId: string): string {
  const token = createSessionToken();
  volunteerSessions.set(token, volunteerId);
  return token;
}

export function getVolunteerIdBySession(token?: string | null): string | null {
  if (!token) return null;
  return volunteerSessions.get(token) ?? null;
}

export function clearVolunteerSession(token?: string | null) {
  if (token) volunteerSessions.delete(token);
}

export function createAdminSession(adminId: string): string {
  const token = createSessionToken();
  adminSessions.set(token, adminId);
  return token;
}

export function getAdminIdBySession(token?: string | null): string | null {
  if (!token) return null;
  return adminSessions.get(token) ?? null;
}

export function clearAdminSession(token?: string | null) {
  if (token) adminSessions.delete(token);
}

function pushLog(
  store: SharedStoreData,
  entry: Omit<SharedActivityLog, "id" | "createdAt">,
) {
  store.logs.unshift({
    id: createId("log"),
    createdAt: new Date().toISOString(),
    ...entry,
  });
}

export function appendActivityLog(
  entry: Omit<SharedActivityLog, "id" | "createdAt">,
): SharedActivityLog {
  const store = ensureStore();
  const log: SharedActivityLog = {
    id: createId("log"),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  store.logs.unshift(log);
  saveStore(store);
  return log;
}

export function listActivityLogs(filter?: {
  actorType?: SharedActivityLog["actorType"];
  action?: string;
}): SharedActivityLog[] {
  return ensureStore()
    .logs.filter((item) => {
      if (filter?.actorType && item.actorType !== filter.actorType) return false;
      if (filter?.action && !item.action.includes(filter.action)) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function upsertElder(input: Omit<SharedElder, "updatedAt">): SharedElder {
  const store = ensureStore();
  const existing = store.elders.find((item) => item.deviceKey === input.deviceKey);
  const updated: SharedElder = {
    ...input,
    disabled: existing?.disabled ?? input.disabled ?? false,
    updatedAt: new Date().toISOString(),
  };
  const index = store.elders.findIndex((item) => item.deviceKey === input.deviceKey);
  if (index >= 0) store.elders[index] = updated;
  else store.elders.push(updated);
  pushLog(store, {
    actorType: "elder",
    actorId: input.deviceKey,
    action: "elder.upsert",
    metadata: { name: input.name },
  });
  saveStore(store);
  return updated;
}

export function listElders(): SharedElder[] {
  return ensureStore()
    .elders.slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function setElderDisabled(deviceKey: string, disabled: boolean): SharedElder {
  const store = ensureStore();
  const index = store.elders.findIndex((item) => item.deviceKey === deviceKey);
  if (index < 0) throw new Error("NOT_FOUND");
  store.elders[index] = { ...store.elders[index], disabled, updatedAt: new Date().toISOString() };
  pushLog(store, {
    actorType: "admin",
    action: disabled ? "elder.disable" : "elder.enable",
    actorId: deviceKey,
  });
  saveStore(store);
  return store.elders[index];
}

export function createHelpRequestRecord(
  input: Omit<SharedHelpRequest, "id" | "status" | "createdAt">,
): SharedHelpRequest {
  const store = ensureStore();
  const elder = store.elders.find((item) => item.deviceKey === input.deviceKey);
  if (elder?.disabled) throw new Error("ELDER_DISABLED");
  const record: SharedHelpRequest = {
    id: createId("help"),
    status: "pending",
    createdAt: new Date().toISOString(),
    ...input,
  };
  store.helpRequests.unshift(record);
  pushLog(store, {
    actorType: "elder",
    actorId: input.deviceKey,
    action: "help_request.create",
    metadata: { requestId: record.id },
  });
  saveStore(store);
  return record;
}

export function listHelpRequests(filter?: {
  deviceKey?: string;
  volunteerId?: string;
}): SharedHelpRequest[] {
  return ensureStore()
    .helpRequests.filter((item) => {
      if (filter?.deviceKey && item.deviceKey !== filter.deviceKey) return false;
      if (filter?.volunteerId && item.volunteerId !== filter.volunteerId) return false;
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
  if (store.helpRequests[index].status !== "pending") throw new Error("NOT_PENDING");
  store.helpRequests[index] = {
    ...store.helpRequests[index],
    status: "accepted",
    volunteerId,
  };
  pushLog(store, {
    actorType: "volunteer",
    actorId: volunteerId,
    action: "help_request.accept",
    metadata: { requestId },
  });
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
  pushLog(store, {
    actorType: "volunteer",
    actorId: volunteerId,
    action: "help_request.complete",
    metadata: { requestId },
  });
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

  pushLog(store, {
    actorType: "elder",
    actorId: deviceKey,
    action: "help_request.confirm",
    metadata: { requestId, volunteerId: request.volunteerId },
  });
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
  pushLog(store, {
    actorType: "volunteer",
    actorId: volunteer.id,
    action: "volunteer.register",
    metadata: { email },
  });
  saveStore(store);
  return volunteer;
}

export function loginVolunteer(email: string, password: string): SharedVolunteer {
  const store = ensureStore();
  const volunteer = store.volunteers.find(
    (item) => item.email === email.trim().toLowerCase(),
  );
  if (!volunteer || volunteer.passwordHash !== hashPassword(password)) {
    throw new Error("INVALID_CREDENTIALS");
  }
  if (volunteer.disabled) throw new Error("DISABLED");
  pushLog(store, {
    actorType: "volunteer",
    actorId: volunteer.id,
    action: "volunteer.login",
  });
  saveStore(store);
  return volunteer;
}

export function getVolunteer(id: string): SharedVolunteer | null {
  return ensureStore().volunteers.find((item) => item.id === id) ?? null;
}

export function listVolunteers(): SharedVolunteer[] {
  return ensureStore()
    .volunteers.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function approveVolunteer(id: string, adminId?: string): SharedVolunteer {
  const store = ensureStore();
  const index = store.volunteers.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("NOT_FOUND");
  store.volunteers[index] = { ...store.volunteers[index], approved: true };
  pushLog(store, {
    actorType: adminId ? "admin" : "system",
    actorId: adminId ?? id,
    action: "volunteer.approve",
    metadata: { volunteerId: id },
  });
  saveStore(store);
  return store.volunteers[index];
}

export function setVolunteerDisabled(
  id: string,
  disabled: boolean,
  adminId?: string,
): SharedVolunteer {
  const store = ensureStore();
  const index = store.volunteers.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("NOT_FOUND");
  store.volunteers[index] = { ...store.volunteers[index], disabled };
  pushLog(store, {
    actorType: "admin",
    actorId: adminId,
    action: disabled ? "volunteer.disable" : "volunteer.enable",
    metadata: { volunteerId: id },
  });
  saveStore(store);
  return store.volunteers[index];
}

export function adjustVolunteerPoints(
  id: string,
  points: number,
  adminId?: string,
): SharedVolunteer {
  const store = ensureStore();
  const index = store.volunteers.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("NOT_FOUND");
  store.volunteers[index] = {
    ...store.volunteers[index],
    points: Math.max(0, Math.floor(points)),
  };
  pushLog(store, {
    actorType: "admin",
    actorId: adminId,
    action: "volunteer.points_adjust",
    metadata: { volunteerId: id, points },
  });
  saveStore(store);
  return store.volunteers[index];
}

export function listLeaderboard(month?: string): Array<{
  id: string;
  name: string;
  points: number;
}> {
  void month;
  return ensureStore()
    .volunteers.filter((item) => item.approved && !item.disabled)
    .map((item) => ({ id: item.id, name: item.name, points: item.points }))
    .sort((a, b) => b.points - a.points);
}

export function createEmergencyRecord(
  input: Omit<
    SharedEmergency,
    "id" | "createdAt" | "notifiedAdmin" | "policeShareToken"
  > & { policeShareToken?: string },
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
  pushLog(store, {
    actorType: "elder",
    actorId: input.deviceKey,
    action: "emergency.create",
    metadata: { emergencyId: record.id },
  });
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

export function getEmergencyByToken(token: string): SharedEmergency | null {
  return (
    ensureStore().emergencies.find((item) => item.policeShareToken === token) ??
    null
  );
}

export function listEmergencies(): SharedEmergency[] {
  return ensureStore()
    .emergencies.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function loginAdmin(email: string, password: string): SharedAdmin {
  const store = ensureStore();
  const admin = store.admins.find(
    (item) => item.email === email.trim().toLowerCase(),
  );
  if (!admin || admin.passwordHash !== hashPassword(password)) {
    throw new Error("INVALID_CREDENTIALS");
  }
  pushLog(store, {
    actorType: "admin",
    actorId: admin.id,
    action: "admin.login",
  });
  saveStore(store);
  return admin;
}

export function getAdmin(id: string): SharedAdmin | null {
  return ensureStore().admins.find((item) => item.id === id) ?? null;
}

export function getActivitySummary() {
  const store = ensureStore();
  const elderActivity = store.elders.map((elder) => {
    const requests = store.helpRequests.filter(
      (item) => item.deviceKey === elder.deviceKey,
    ).length;
    const emergencies = store.emergencies.filter(
      (item) => item.deviceKey === elder.deviceKey,
    ).length;
    return {
      id: elder.deviceKey,
      name: elder.name,
      requests,
      emergencies,
      disabled: Boolean(elder.disabled),
      updatedAt: elder.updatedAt,
    };
  });

  const volunteerActivity = store.volunteers.map((volunteer) => {
    const accepted = store.helpRequests.filter(
      (item) => item.volunteerId === volunteer.id,
    ).length;
    const completed = store.helpRequests.filter(
      (item) =>
        item.volunteerId === volunteer.id && item.status === "completed",
    ).length;
    return {
      id: volunteer.id,
      name: volunteer.name,
      accepted,
      completed,
      points: volunteer.points,
      approved: volunteer.approved,
      disabled: volunteer.disabled,
      createdAt: volunteer.createdAt,
    };
  });

  return { elders: elderActivity, volunteers: volunteerActivity };
}

export function listPairings() {
  const store = ensureStore();
  return store.helpRequests.map((request) => {
    const volunteer = request.volunteerId
      ? store.volunteers.find((item) => item.id === request.volunteerId)
      : null;
    return {
      ...request,
      volunteerName: volunteer?.name ?? null,
      volunteerEmail: volunteer?.email ?? null,
    };
  });
}

export { POINTS_PER_COMPLETED_REQUEST, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD };
