/**
 * Shared database types (skeleton).
 * Full Supabase schema will be added in a later stage.
 */

export type RequestStatus = "pending" | "accepted" | "completed";

export type ElderProfile = {
  id: string;
  deviceKey: string;
  name: string;
  age: number;
  phone: string;
  address: string;
  emergencyContact: string;
  healthNotes?: string | null;
  createdAt: string;
};

export type VolunteerProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  serviceAreas: string[];
  bio: string;
  approved: boolean;
  disabled: boolean;
  points: number;
  createdAt: string;
};

export type HelpRequest = {
  id: string;
  elderId: string;
  volunteerId?: string | null;
  status: RequestStatus;
  audioPath?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  completedAt?: string | null;
  elderConfirmedAt?: string | null;
};

export type EmergencyEvent = {
  id: string;
  elderId: string;
  latitude?: number | null;
  longitude?: number | null;
  policeShareToken: string;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  actorType: "elder" | "volunteer" | "admin" | "system";
  actorId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
