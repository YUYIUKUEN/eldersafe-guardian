import type { RequestStatus } from "../types/database";

export type StoredElderProfile = {
  deviceKey: string;
  name: string;
  age: number;
  phone: string;
  address: string;
  emergencyContact: string;
  healthNotes?: string;
  createdAt: string;
};

export type StoredHelpRequest = {
  id: string;
  deviceKey: string;
  status: RequestStatus;
  audioDataUrl?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  completedAt?: string;
  elderConfirmedAt?: string;
};

export type StoredEmergencyEvent = {
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
