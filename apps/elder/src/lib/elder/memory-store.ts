import { randomUUID } from "node:crypto";
import {
  decodeEmergencyContact,
  encodeEmergencyContact,
  type ElderRegisterPayload,
} from "@eldersafe/shared";
import type { ElderRecord, ElderStore } from "./types";

type MemoryState = {
  elders: Map<string, ElderRecord>;
  byHash: Map<string, string>;
  logs: Array<Record<string, unknown>>;
};

function getMemoryState(): MemoryState {
  const globalKey = "__eldersafe_elder_memory_store__";
  const g = globalThis as typeof globalThis & {
    [globalKey]?: MemoryState;
  };
  if (!g[globalKey]) {
    g[globalKey] = {
      elders: new Map(),
      byHash: new Map(),
      logs: [],
    };
  }
  return g[globalKey];
}

export function createMemoryElderStore(): ElderStore {
  const state = getMemoryState();

  return {
    mode: "memory",
    async register(payload, deviceKeyHash, consentVersion) {
      if (state.byHash.has(deviceKeyHash)) {
        throw new Error("DEVICE_KEY_CONFLICT");
      }

      const id = randomUUID();
      const now = new Date().toISOString();
      const record: ElderRecord = {
        id,
        name: payload.name,
        age: payload.age,
        phone: payload.phone,
        address: payload.address,
        emergencyContact: payload.emergencyContact,
        healthNotes: payload.healthNotes,
        language: payload.language,
        consentVersion,
        consentAcceptedAt: now,
        deviceKeyHash,
        isDisabled: false,
      };

      state.elders.set(id, record);
      state.byHash.set(deviceKeyHash, id);
      return record;
    },
    async findByDeviceKeyHash(deviceKeyHash) {
      const id = state.byHash.get(deviceKeyHash);
      if (!id) return null;
      const record = state.elders.get(id) ?? null;
      if (!record || record.isDisabled) return null;
      return record;
    },
    async updateProfile(id, payload) {
      const current = state.elders.get(id);
      if (!current || current.isDisabled) {
        throw new Error("ELDER_NOT_FOUND");
      }
      const next: ElderRecord = {
        ...current,
        name: payload.name,
        age: payload.age,
        phone: payload.phone,
        address: payload.address,
        emergencyContact: payload.emergencyContact,
        healthNotes: payload.healthNotes,
        language: payload.language,
      };
      state.elders.set(id, next);
      return next;
    },
    async writeActivity(input) {
      state.logs.push({
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        ...input,
      });
    },
  };
}

/** Test helper: encode shape matches Supabase column. */
export function memoryEmergencyContactColumn(
  payload: ElderRegisterPayload,
): string {
  return encodeEmergencyContact(payload.emergencyContact);
}

export function memoryDecodeEmergencyContact(raw: string) {
  return decodeEmergencyContact(raw);
}
