/**
 * Shared helpers for reading public and server environment variables.
 * Secrets must only live in .env.local and must never be committed.
 */

export function isEmergencyTestMode(): boolean {
  return process.env.EMERGENCY_TEST_MODE === "true";
}

/**
 * Phone number used by the elder emergency button in test mode.
 * Must NOT be 999 when EMERGENCY_TEST_MODE=true.
 */
export function getEmergencyTestPhone(): string {
  const phone = process.env.EMERGENCY_TEST_PHONE?.trim();

  if (!phone) {
    throw new Error("EMERGENCY_TEST_PHONE is not set in .env.local");
  }

  if (isEmergencyTestMode() && (phone === "999" || phone === "tel:999")) {
    throw new Error(
      "EMERGENCY_TEST_PHONE must not be 999 while EMERGENCY_TEST_MODE=true",
    );
  }

  return phone;
}
