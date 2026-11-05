import type { RequestStatus } from "../types/database";

export type SharedElder = {
  deviceKey: string;
  name: string;
  age: number;
  phone: string;
  address: string;
  emergencyContact: string;
  healthNotes?: string;
  disabled?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SharedVolunteer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  age: number;
  serviceAreas: string[];
  bio: string;
  approved: boolean;
  disabled: boolean;
  points: number;
  createdAt: string;
};

export type SharedAdmin = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type SharedHelpRequest = {
  id: string;
  deviceKey: string;
  elderName: string;
  elderAge: number;
  elderAddress: string;
  status: RequestStatus;
  volunteerId?: string | null;
  audioDataUrl?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  completedAt?: string;
  elderConfirmedAt?: string;
};

export type SharedEmergency = {
  id: string;
  deviceKey: string;
  policeShareToken: string;
  elderName: string;
  latitude?: number;
  longitude?: number;
  locationUpdatedAt?: string;
  createdAt: string;
  notifiedAdmin: boolean;
};

export type SharedActivityLog = {
  id: string;
  actorType: "elder" | "volunteer" | "admin" | "system";
  actorId?: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type SharedStoreData = {
  elders: SharedElder[];
  volunteers: SharedVolunteer[];
  admins: SharedAdmin[];
  helpRequests: SharedHelpRequest[];
  emergencies: SharedEmergency[];
  logs: SharedActivityLog[];
};
