import { isValidHkPhone, normalizeHkPhone } from "../elder/validation";
import { isPasswordAcceptable, VOLUNTEER_PASSWORD_MIN_LENGTH } from "./password";
import type {
  VolunteerProfileInput,
  VolunteerProfileInputLoose,
  VolunteerRegisterInput,
  VolunteerRegisterInputLoose,
} from "./types";

export type VolunteerField =
  | "name"
  | "phone"
  | "email"
  | "password"
  | "age"
  | "serviceAreas"
  | "bio"
  | "consent";

export type VolunteerValidationIssue = {
  field: VolunteerField;
  code:
    | "required"
    | "too_long"
    | "age_invalid"
    | "phone_invalid"
    | "email_invalid"
    | "password_weak"
    | "password_too_short"
    | "areas_required"
    | "consent_required";
};

const NAME_MAX = 80;
const BIO_MAX = 1000;
const EMAIL_MAX = 254;
const AREA_MAX = 80;
const AREA_COUNT_MAX = 12;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim();
}

function parseServiceAreas(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const areas = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return areas;
  }

  if (typeof value === "string") {
    return value
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return null;
}

export function validateVolunteerRegisterInput(
  input: VolunteerRegisterInputLoose,
): { value?: VolunteerRegisterInput; issues: VolunteerValidationIssue[] } {
  const issues: VolunteerValidationIssue[] = [];

  const nameRaw = trimString(input.name);
  let name: string | undefined;
  if (!nameRaw) {
    issues.push({ field: "name", code: "required" });
  } else if (nameRaw.length > NAME_MAX) {
    issues.push({ field: "name", code: "too_long" });
  } else {
    name = nameRaw;
  }

  const phoneRaw = trimString(input.phone);
  let phone: string | undefined;
  if (!phoneRaw) {
    issues.push({ field: "phone", code: "required" });
  } else if (!isValidHkPhone(phoneRaw)) {
    issues.push({ field: "phone", code: "phone_invalid" });
  } else {
    phone = normalizeHkPhone(phoneRaw);
  }

  const emailRaw = trimString(input.email)?.toLowerCase();
  let email: string | undefined;
  if (!emailRaw) {
    issues.push({ field: "email", code: "required" });
  } else if (emailRaw.length > EMAIL_MAX || !EMAIL_RE.test(emailRaw)) {
    issues.push({ field: "email", code: "email_invalid" });
  } else {
    email = emailRaw;
  }

  const password = typeof input.password === "string" ? input.password : "";
  if (!password) {
    issues.push({ field: "password", code: "required" });
  } else if (password.length < VOLUNTEER_PASSWORD_MIN_LENGTH) {
    issues.push({ field: "password", code: "password_too_short" });
  } else if (!isPasswordAcceptable(password)) {
    issues.push({ field: "password", code: "password_weak" });
  }

  const ageRaw = input.age;
  const age =
    typeof ageRaw === "number"
      ? ageRaw
      : typeof ageRaw === "string" && ageRaw.trim()
        ? Number(ageRaw)
        : NaN;
  if (!Number.isInteger(age) || age < 16 || age > 100) {
    issues.push({ field: "age", code: "age_invalid" });
  }

  const areas = parseServiceAreas(input.serviceAreas) ?? [];
  if (areas.length === 0) {
    issues.push({ field: "serviceAreas", code: "areas_required" });
  } else if (
    areas.length > AREA_COUNT_MAX ||
    areas.some((area) => area.length > AREA_MAX)
  ) {
    issues.push({ field: "serviceAreas", code: "too_long" });
  }

  const bioRaw = trimString(input.bio) ?? "";
  if (bioRaw.length > BIO_MAX) {
    issues.push({ field: "bio", code: "too_long" });
  }

  if (input.consent !== true && input.consent !== "true") {
    issues.push({ field: "consent", code: "consent_required" });
  }

  if (issues.length > 0 || !name || !phone || !email) {
    return { issues };
  }

  return {
    value: {
      name,
      phone,
      email,
      password,
      age,
      serviceAreas: areas,
      bio: bioRaw,
      consent: true,
    },
    issues: [],
  };
}

export function validateVolunteerProfileInput(
  input: VolunteerProfileInputLoose,
): { value?: VolunteerProfileInput; issues: VolunteerValidationIssue[] } {
  const issues: VolunteerValidationIssue[] = [];

  const nameRaw = trimString(input.name);
  let name: string | undefined;
  if (!nameRaw) {
    issues.push({ field: "name", code: "required" });
  } else if (nameRaw.length > NAME_MAX) {
    issues.push({ field: "name", code: "too_long" });
  } else {
    name = nameRaw;
  }

  const phoneRaw = trimString(input.phone);
  let phone: string | undefined;
  if (!phoneRaw) {
    issues.push({ field: "phone", code: "required" });
  } else if (!isValidHkPhone(phoneRaw)) {
    issues.push({ field: "phone", code: "phone_invalid" });
  } else {
    phone = normalizeHkPhone(phoneRaw);
  }

  const ageRaw = input.age;
  const age =
    typeof ageRaw === "number"
      ? ageRaw
      : typeof ageRaw === "string" && ageRaw.trim()
        ? Number(ageRaw)
        : NaN;
  if (!Number.isInteger(age) || age < 16 || age > 100) {
    issues.push({ field: "age", code: "age_invalid" });
  }

  const areas = parseServiceAreas(input.serviceAreas) ?? [];
  if (areas.length === 0) {
    issues.push({ field: "serviceAreas", code: "areas_required" });
  } else if (
    areas.length > AREA_COUNT_MAX ||
    areas.some((area) => area.length > AREA_MAX)
  ) {
    issues.push({ field: "serviceAreas", code: "too_long" });
  }

  const bioRaw = trimString(input.bio) ?? "";
  if (bioRaw.length > BIO_MAX) {
    issues.push({ field: "bio", code: "too_long" });
  }

  if (issues.length > 0 || !name || !phone) {
    return { issues };
  }

  return {
    value: {
      name,
      phone,
      age,
      serviceAreas: areas,
      bio: bioRaw,
    },
    issues: [],
  };
}

export function validateLoginInput(input: {
  email?: unknown;
  password?: unknown;
}): {
  value?: { email: string; password: string };
  issues: Array<{ field: "email" | "password"; code: "required" | "email_invalid" }>;
} {
  const issues: Array<{
    field: "email" | "password";
    code: "required" | "email_invalid";
  }> = [];

  const emailRaw = trimString(input.email)?.toLowerCase();
  let email: string | undefined;
  if (!emailRaw) {
    issues.push({ field: "email", code: "required" });
  } else if (!EMAIL_RE.test(emailRaw)) {
    issues.push({ field: "email", code: "email_invalid" });
  } else {
    email = emailRaw;
  }

  const password = typeof input.password === "string" ? input.password : "";
  if (!password) {
    issues.push({ field: "password", code: "required" });
  }

  if (issues.length > 0 || !email) {
    return { issues };
  }

  return { value: { email, password }, issues: [] };
}

export function validateForgotPasswordInput(input: { email?: unknown }): {
  value?: { email: string };
  issues: Array<{ field: "email"; code: "required" | "email_invalid" }>;
} {
  const issues: Array<{ field: "email"; code: "required" | "email_invalid" }> =
    [];
  const emailRaw = trimString(input.email)?.toLowerCase();
  if (!emailRaw) {
    issues.push({ field: "email", code: "required" });
  } else if (!EMAIL_RE.test(emailRaw)) {
    issues.push({ field: "email", code: "email_invalid" });
  }

  if (issues.length > 0 || !emailRaw) {
    return { issues };
  }

  return { value: { email: emailRaw }, issues: [] };
}

export function validateResetPasswordInput(input: {
  password?: unknown;
}): {
  value?: { password: string };
  issues: Array<{
    field: "password";
    code: "required" | "password_too_short" | "password_weak";
  }>;
} {
  const issues: Array<{
    field: "password";
    code: "required" | "password_too_short" | "password_weak";
  }> = [];
  const password = typeof input.password === "string" ? input.password : "";

  if (!password) {
    issues.push({ field: "password", code: "required" });
  } else if (password.length < VOLUNTEER_PASSWORD_MIN_LENGTH) {
    issues.push({ field: "password", code: "password_too_short" });
  } else if (!isPasswordAcceptable(password)) {
    issues.push({ field: "password", code: "password_weak" });
  }

  if (issues.length > 0) {
    return { issues };
  }

  return { value: { password }, issues: [] };
}
