import type { AppLocale } from "../i18n/locales";

export type ElderEmergencyContact = {
  name: string;
  phone: string;
};

export type ElderProfileInput = {
  name: string;
  age: number;
  phone: string;
  address: string;
  /** Optional preferred meeting spot used when elder picks "custom". */
  meetingPlace: string | null;
  emergencyContact: ElderEmergencyContact;
  healthNotes: string | null;
  language: AppLocale;
};

export type ElderPublicProfile = {
  id: string;
  name: string;
  age: number;
  phone: string;
  address: string;
  meetingPlace: string | null;
  emergencyContact: ElderEmergencyContact;
  healthNotes: string | null;
  language: AppLocale;
  consentVersion: string;
  consentAcceptedAt: string;
};

export type HelpMeetingType = "home" | "custom";

export type ElderRegisterPayload = ElderProfileInput & {
  consentAccepted: boolean;
};
