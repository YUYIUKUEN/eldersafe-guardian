"use client";

export const ELDER_DEVICE_KEY_STORAGE = "eldersafe_device_key";

export function readDeviceKey(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ELDER_DEVICE_KEY_STORAGE);
  return value && value.trim() ? value.trim() : null;
}

export function writeDeviceKey(rawKey: string): void {
  window.localStorage.setItem(ELDER_DEVICE_KEY_STORAGE, rawKey);
}

export function clearDeviceKey(): void {
  window.localStorage.removeItem(ELDER_DEVICE_KEY_STORAGE);
}
