"use client";

import type { ElderPublicProfile, ElderRegisterPayload } from "@eldersafe/shared";
import { readDeviceKey } from "./device-storage";

export type ApiErrorBody = {
  error: string;
  issues?: Array<{ field: string; code: string }>;
  storeMode?: "supabase" | "memory";
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function registerElder(
  payload: ElderRegisterPayload,
): Promise<{ deviceKey: string; elder: ElderPublicProfile; storeMode: string }> {
  const response = await fetch("/api/elders/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await parseJson<
    | { deviceKey: string; elder: ElderPublicProfile; storeMode: string }
    | ApiErrorBody
  >(response);
  if (!response.ok) {
    throw body;
  }
  return body as {
    deviceKey: string;
    elder: ElderPublicProfile;
    storeMode: string;
  };
}

export async function fetchElderSession(deviceKey?: string | null): Promise<{
  elder: ElderPublicProfile;
  storeMode: string;
} | null> {
  const key = deviceKey ?? readDeviceKey();
  if (!key) return null;

  const response = await fetch("/api/elders/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceKey: key }),
  });

  if (response.status === 401 || response.status === 404) {
    return null;
  }

  const body = await parseJson<
    { elder: ElderPublicProfile; storeMode: string } | ApiErrorBody
  >(response);
  if (!response.ok) {
    throw body;
  }
  return body as { elder: ElderPublicProfile; storeMode: string };
}

export async function fetchElderProfile(): Promise<{
  elder: ElderPublicProfile;
  storeMode: string;
}> {
  const key = readDeviceKey();
  if (!key) {
    throw { error: "missing_device_key" } satisfies ApiErrorBody;
  }

  const response = await fetch("/api/elders/me", {
    headers: { "X-Elder-Device-Key": key },
  });
  const body = await parseJson<
    { elder: ElderPublicProfile; storeMode: string } | ApiErrorBody
  >(response);
  if (!response.ok) {
    throw body;
  }
  return body as { elder: ElderPublicProfile; storeMode: string };
}

export async function updateElderProfile(
  payload: Omit<ElderRegisterPayload, "consentAccepted">,
): Promise<{ elder: ElderPublicProfile; storeMode: string }> {
  const key = readDeviceKey();
  if (!key) {
    throw { error: "missing_device_key" } satisfies ApiErrorBody;
  }

  const response = await fetch("/api/elders/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Elder-Device-Key": key,
    },
    body: JSON.stringify(payload),
  });
  const body = await parseJson<
    { elder: ElderPublicProfile; storeMode: string } | ApiErrorBody
  >(response);
  if (!response.ok) {
    throw body;
  }
  return body as { elder: ElderPublicProfile; storeMode: string };
}
