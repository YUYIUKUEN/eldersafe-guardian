/**
 * Certificate layout / copy defaults.
 * Organisation name can be overridden with CERTIFICATE_ORG_NAME.
 */
export const CERTIFICATE_DEFAULTS = {
  orgNameZh: "ElderSafe Guardian",
  orgNameEn: "ElderSafe Guardian",
  titleZh: "傑出義工證書",
  titleEn: "Outstanding Volunteer Certificate",
  rankLabelsZh: {
    1: "冠軍",
    2: "亞軍",
    3: "季軍",
  } as Record<1 | 2 | 3, string>,
  rankLabelsEn: {
    1: "1st Place",
    2: "2nd Place",
    3: "3rd Place",
  } as Record<1 | 2 | 3, string>,
} as const;

export function getCertificateOrgName(): {
  zh: string;
  en: string;
} {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.CERTIFICATE_ORG_NAME?.trim()
      : undefined;
  if (fromEnv) {
    return { zh: fromEnv, en: fromEnv };
  }
  return {
    zh: CERTIFICATE_DEFAULTS.orgNameZh,
    en: CERTIFICATE_DEFAULTS.orgNameEn,
  };
}

export type CertificatePdfInput = {
  volunteerName: string;
  rank: 1 | 2 | 3;
  yearMonth: string;
  completedCount: number;
  points?: number;
  issuedAt?: Date;
  orgNameZh?: string;
  orgNameEn?: string;
};
