import { createHash, randomBytes } from "node:crypto";

/** Generate a high-entropy device key. Only the hash is persisted server-side. */
export function generateDeviceKey(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex hash of the raw device key. */
export function hashDeviceKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}
