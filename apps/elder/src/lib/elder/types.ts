import type { ElderPublicProfile, ElderRegisterPayload } from "@eldersafe/shared";

export type ElderRecord = ElderPublicProfile & {
  deviceKeyHash: string;
  isDisabled: boolean;
};

export type ElderStore = {
  mode: "supabase" | "memory";
  register(
    payload: ElderRegisterPayload,
    deviceKeyHash: string,
    consentVersion: string,
  ): Promise<ElderRecord>;
  findByDeviceKeyHash(deviceKeyHash: string): Promise<ElderRecord | null>;
  updateProfile(
    id: string,
    payload: Omit<ElderRegisterPayload, "consentAccepted">,
  ): Promise<ElderRecord>;
  writeActivity(input: {
    actorType: "elder" | "volunteer" | "admin" | "system";
    actorId?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void>;
};

export function toPublicProfile(record: ElderRecord): ElderPublicProfile {
  return {
    id: record.id,
    name: record.name,
    age: record.age,
    phone: record.phone,
    address: record.address,
    emergencyContact: record.emergencyContact,
    healthNotes: record.healthNotes,
    language: record.language,
    consentVersion: record.consentVersion,
    consentAcceptedAt: record.consentAcceptedAt,
  };
}
