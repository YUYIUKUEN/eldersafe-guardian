import type { PasswordStrength } from "./types";

export const VOLUNTEER_PASSWORD_MIN_LENGTH = 8;

/** Score password for the register UI strength meter (not a security guarantee). */
export function scorePasswordStrength(password: string): PasswordStrength {
  if (password.length < VOLUNTEER_PASSWORD_MIN_LENGTH) {
    return "too_short";
  }

  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 14) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "good";
  return "strong";
}

export function isPasswordAcceptable(password: string): boolean {
  const strength = scorePasswordStrength(password);
  return strength !== "too_short" && strength !== "weak";
}
