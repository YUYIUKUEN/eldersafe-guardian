import { hashDeviceKey } from "@eldersafe/shared";
import { getElderStore } from "./store";
import type { ElderRecord } from "./types";

export async function resolveElderFromRequest(
  request: Request,
): Promise<ElderRecord | null> {
  const headerKey = request.headers.get("x-elder-device-key")?.trim();
  if (!headerKey) return null;

  const store = getElderStore();
  return store.findByDeviceKeyHash(hashDeviceKey(headerKey));
}
