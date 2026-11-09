"use client";

import type { ElderValidationIssue } from "@eldersafe/shared";
import { useTranslations } from "next-intl";

export function useElderValidationMessage() {
  const t = useTranslations("Onboarding.errors");

  return (issue: ElderValidationIssue | null | undefined): string | null => {
    if (!issue) return null;
    return t(`${issue.field}.${issue.code}`);
  };
}

export function firstIssueForField(
  issues: ElderValidationIssue[],
  field: ElderValidationIssue["field"],
): ElderValidationIssue | undefined {
  return issues.find((issue) => issue.field === field);
}
