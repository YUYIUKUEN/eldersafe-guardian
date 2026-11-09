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
  emergencyContact: ElderEmergencyContact;
  healthNotes: string | null;
  language: AppLocale;
  consentVersion: string;
  consentAcceptedAt: string;
};

export type ElderRegisterPayload = ElderProfileInput & {
  consentAccepted: boolean;
};
