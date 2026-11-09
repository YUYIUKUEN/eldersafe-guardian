import { locales, type AppLocale } from "../i18n/locales";
import type { ElderProfileInput, ElderRegisterPayload } from "./types";

export type ElderField =
  | "name"
  | "age"
  | "phone"
  | "address"
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "healthNotes"
  | "consent"
  | "language";

export type ElderValidationIssue = {
  field: ElderField;
  code:
    | "required"
    | "too_long"
    | "age_invalid"
    | "phone_invalid"
    | "consent_required"
    | "language_invalid";
};

const NAME_MAX = 80;
const ADDRESS_MAX = 300;
const HEALTH_NOTES_MAX = 1000;

export function normalizeHkPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("852") && digits.length === 11) {
    return digits.slice(3);
  }
  return digits;
}

/** Hong Kong fixed/mobile numbers: 8 digits, first digit 2–9. */
export function isValidHkPhone(input: string): boolean {
  return /^[2-9]\d{7}$/.test(normalizeHkPhone(input));
}

function trimRequired(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

export type ElderProfileInputLoose = Omit<Partial<ElderProfileInput>, "age"> & {
  age?: number | string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  healthNotes?: string | null;
};

export function validateElderProfileInput(
  input: ElderProfileInputLoose,
): { value?: ElderProfileInput; issues: ElderValidationIssue[] } {
  const issues: ElderValidationIssue[] = [];

  const name = trimRequired(input.name, NAME_MAX);
  if (!name) {
    issues.push({
      field: "name",
      code: typeof input.name === "string" && input.name.trim().length > NAME_MAX
        ? "too_long"
        : "required",
    });
  }

  const ageRaw = input.age;
  const age =
    typeof ageRaw === "number"
      ? ageRaw
      : typeof ageRaw === "string" && ageRaw.trim()
        ? Number(ageRaw)
        : NaN;
  if (!Number.isInteger(age) || age < 1 || age > 130) {
    issues.push({ field: "age", code: "age_invalid" });
  }

  const phoneRaw = typeof input.phone === "string" ? input.phone : "";
  const phone = normalizeHkPhone(phoneRaw);
  if (!phone) {
    issues.push({ field: "phone", code: "required" });
  } else if (!isValidHkPhone(phoneRaw)) {
    issues.push({ field: "phone", code: "phone_invalid" });
  }

  const address = trimRequired(input.address, ADDRESS_MAX);
  if (!address) {
    issues.push({
      field: "address",
      code:
        typeof input.address === "string" &&
        input.address.trim().length > ADDRESS_MAX
          ? "too_long"
          : "required",
    });
  }

  const emergencyName =
    trimRequired(
      input.emergencyContact?.name ?? input.emergencyContactName,
      NAME_MAX,
    ) ?? null;
  if (!emergencyName) {
    const raw =
      input.emergencyContact?.name ?? input.emergencyContactName ?? "";
    issues.push({
      field: "emergencyContactName",
      code: typeof raw === "string" && raw.trim().length > NAME_MAX
        ? "too_long"
        : "required",
    });
  }

  const emergencyPhoneRaw =
    input.emergencyContact?.phone ?? input.emergencyContactPhone ?? "";
  const emergencyPhone = normalizeHkPhone(
    typeof emergencyPhoneRaw === "string" ? emergencyPhoneRaw : "",
  );
  if (!emergencyPhone) {
    issues.push({ field: "emergencyContactPhone", code: "required" });
  } else if (
    !isValidHkPhone(
      typeof emergencyPhoneRaw === "string" ? emergencyPhoneRaw : "",
    )
  ) {
    issues.push({ field: "emergencyContactPhone", code: "phone_invalid" });
  }

  let healthNotes: string | null = null;
  if (typeof input.healthNotes === "string") {
    const trimmed = input.healthNotes.trim();
    if (trimmed.length > HEALTH_NOTES_MAX) {
      issues.push({ field: "healthNotes", code: "too_long" });
    } else {
      healthNotes = trimmed.length > 0 ? trimmed : null;
    }
  } else if (input.healthNotes != null) {
    issues.push({ field: "healthNotes", code: "too_long" });
  }

  const language = input.language;
  if (!language || !(locales as readonly string[]).includes(language)) {
    issues.push({ field: "language", code: "language_invalid" });
  }

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues,
    value: {
      name: name!,
      age: age,
      phone,
      address: address!,
      emergencyContact: {
        name: emergencyName!,
        phone: emergencyPhone,
      },
      healthNotes,
      language: language as AppLocale,
    },
  };
}

export function validateElderRegisterPayload(
  input: ElderProfileInputLoose & {
    consentAccepted?: boolean;
  },
): { value?: ElderRegisterPayload; issues: ElderValidationIssue[] } {
  const profile = validateElderProfileInput(input);
  const issues = [...profile.issues];

  if (input.consentAccepted !== true) {
    issues.push({ field: "consent", code: "consent_required" });
  }

  if (issues.length > 0 || !profile.value) {
    return { issues };
  }

  return {
    issues,
    value: {
      ...profile.value,
      consentAccepted: true,
    },
  };
}

export function encodeEmergencyContact(contact: {
  name: string;
  phone: string;
}): string {
  return JSON.stringify({
    name: contact.name,
    phone: normalizeHkPhone(contact.phone),
  });
}

export function decodeEmergencyContact(raw: string): {
  name: string;
  phone: string;
} {
  try {
    const parsed = JSON.parse(raw) as { name?: unknown; phone?: unknown };
    if (
      typeof parsed?.name === "string" &&
      typeof parsed?.phone === "string"
    ) {
      return {
        name: parsed.name,
        phone: normalizeHkPhone(parsed.phone),
      };
    }
  } catch {
    // Legacy plain-text rows fall through.
  }

  const [namePart, phonePart] = raw.split("|").map((part) => part.trim());
  return {
    name: namePart || raw,
    phone: phonePart ? normalizeHkPhone(phonePart) : "",
  };
}
