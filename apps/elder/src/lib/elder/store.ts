import {
  tryGetSupabaseAnonConfig,
  tryGetSupabaseServiceRoleKey,
} from "@eldersafe/shared";
import { createMemoryElderStore } from "./memory-store";
import { createSupabaseElderStore } from "./supabase-store";
import type { ElderStore } from "./types";

export function getElderStore(): ElderStore {
  const anon = tryGetSupabaseAnonConfig();
  const serviceRole = tryGetSupabaseServiceRoleKey();
  if (anon && serviceRole) {
    return createSupabaseElderStore();
  }
  return createMemoryElderStore();
}
