import {
  createSupabaseServiceClient,
  decodeEmergencyContact,
  encodeEmergencyContact,
  type AppLocale,
  type ElderRegisterPayload,
} from "@eldersafe/shared";
import type { ElderRecord, ElderStore } from "./types";

type ElderRow = {
  id: string;
  name: string;
  age: number;
  phone: string;
  address: string;
  emergency_contact: string;
  health_notes: string | null;
  language: AppLocale;
  device_key_hash: string;
  consent_version: string;
  consent_accepted_at: string;
  is_disabled: boolean;
};

function mapRow(row: ElderRow): ElderRecord {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    phone: row.phone,
    address: row.address,
    emergencyContact: decodeEmergencyContact(row.emergency_contact),
    healthNotes: row.health_notes,
    language: row.language,
    consentVersion: row.consent_version,
    consentAcceptedAt: row.consent_accepted_at,
    deviceKeyHash: row.device_key_hash,
    isDisabled: row.is_disabled,
  };
}

export function createSupabaseElderStore(): ElderStore {
  const supabase = createSupabaseServiceClient();

  return {
    mode: "supabase",
    async register(payload, deviceKeyHash, consentVersion) {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("elders")
        .insert({
          name: payload.name,
          age: payload.age,
          phone: payload.phone,
          address: payload.address,
          emergency_contact: encodeEmergencyContact(payload.emergencyContact),
          health_notes: payload.healthNotes,
          language: payload.language,
          device_key_hash: deviceKeyHash,
          consent_version: consentVersion,
          consent_accepted_at: now,
        })
        .select(
          "id, name, age, phone, address, emergency_contact, health_notes, language, device_key_hash, consent_version, consent_accepted_at, is_disabled",
        )
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "ELDER_REGISTER_FAILED");
      }

      return mapRow(data as ElderRow);
    },
    async findByDeviceKeyHash(deviceKeyHash) {
      const { data, error } = await supabase
        .from("elders")
        .select(
          "id, name, age, phone, address, emergency_contact, health_notes, language, device_key_hash, consent_version, consent_accepted_at, is_disabled",
        )
        .eq("device_key_hash", deviceKeyHash)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      if (!data || (data as ElderRow).is_disabled) return null;
      return mapRow(data as ElderRow);
    },
    async updateProfile(id, payload: Omit<ElderRegisterPayload, "consentAccepted">) {
      const { data, error } = await supabase
        .from("elders")
        .update({
          name: payload.name,
          age: payload.age,
          phone: payload.phone,
          address: payload.address,
          emergency_contact: encodeEmergencyContact(payload.emergencyContact),
          health_notes: payload.healthNotes,
          language: payload.language,
        })
        .eq("id", id)
        .eq("is_disabled", false)
        .select(
          "id, name, age, phone, address, emergency_contact, health_notes, language, device_key_hash, consent_version, consent_accepted_at, is_disabled",
        )
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("ELDER_NOT_FOUND");
      }
      return mapRow(data as ElderRow);
    },
    async writeActivity(input) {
      const { error } = await supabase.from("activity_logs").insert({
        actor_type: input.actorType,
        actor_id: input.actorId ?? null,
        action: input.action,
        target_type: input.targetType ?? null,
        target_id: input.targetId ?? null,
        metadata: input.metadata ?? null,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}
