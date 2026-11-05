/**
 * Emergency dial number helpers.
 * Test mode MUST never dial 999.
 */

export function isEmergencyTestMode(): boolean {
  return process.env.NEXT_PUBLIC_EMERGENCY_TEST_MODE === "true";
}

export function getEmergencyDialNumber(): string {
  if (isEmergencyTestMode()) {
    const testPhone = process.env.NEXT_PUBLIC_EMERGENCY_TEST_PHONE?.trim();
    if (!testPhone) {
      throw new Error("NEXT_PUBLIC_EMERGENCY_TEST_PHONE is missing");
    }
    if (testPhone === "999") {
      throw new Error("Test mode must not use 999");
    }
    return testPhone;
  }
  return "999";
}

export function getEmergencyTelHref(): string {
  return `tel:${getEmergencyDialNumber()}`;
}
