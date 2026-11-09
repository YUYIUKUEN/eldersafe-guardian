"use client";

import { useLocale, useTranslations } from "next-intl";
import { Suspense, startTransition, useEffect, useMemo, useState } from "react";
import type { AppLocale, ElderValidationIssue } from "@eldersafe/shared";
import {
  normalizeHkPhone,
  validateElderProfileInput,
  validateElderRegisterPayload,
} from "@eldersafe/shared";
import { registerElder, type ApiErrorBody } from "@/lib/elder/api-client";
import { writeDeviceKey } from "@/lib/elder/device-storage";
import {
  firstIssueForField,
  useElderValidationMessage,
} from "@/lib/elder/validation-messages";
import { useRouter } from "@/i18n/navigation";
import { BigButton } from "@/components/ui/BigButton";
import { BigCheckbox } from "@/components/ui/BigCheckbox";
import { BigField } from "@/components/ui/BigField";
import { BigText } from "@/components/ui/BigText";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const DRAFT_STORAGE_KEY = "eldersafe_onboarding_draft";

type StepId =
  | "name"
  | "age"
  | "phone"
  | "address"
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "healthNotes"
  | "review";

type FormState = {
  name: string;
  age: string;
  phone: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  healthNotes: string;
  consentAccepted: boolean;
};

const STEPS: StepId[] = [
  "name",
  "age",
  "phone",
  "address",
  "emergencyContactName",
  "emergencyContactPhone",
  "healthNotes",
  "review",
];

const initialForm: FormState = {
  name: "",
  age: "",
  phone: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  healthNotes: "",
  consentAccepted: false,
};

type DraftState = {
  stepIndex: number;
  form: FormState;
};

function readDraft(): DraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftState;
    if (
      typeof parsed?.stepIndex !== "number" ||
      !parsed.form ||
      typeof parsed.form !== "object"
    ) {
      return null;
    }
    return {
      stepIndex: Math.min(Math.max(parsed.stepIndex, 0), STEPS.length - 1),
      form: { ...initialForm, ...parsed.form },
    };
  } catch {
    return null;
  }
}

function clearDraft() {
  window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function OnboardingWizard() {
  const t = useTranslations("Onboarding");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const messageFor = useElderValidationMessage();

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [hydrated, setHydrated] = useState(false);
  const [issues, setIssues] = useState<ElderValidationIssue[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const draft = readDraft();
    startTransition(() => {
      if (draft) {
        setStepIndex(draft.stepIndex);
        setForm(draft.form);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ stepIndex, form } satisfies DraftState),
    );
  }, [form, hydrated, stepIndex]);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = step === "review";

  const stepIssue = useMemo(() => {
    if (step === "review") {
      return firstIssueForField(issues, "consent");
    }
    return firstIssueForField(issues, step);
  }, [issues, step]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setIssues([]);
    setSubmitError(null);
  }

  function validateCurrentStep(): boolean {
    if (step === "healthNotes") {
      if (form.healthNotes.trim().length > 1000) {
        setIssues([{ field: "healthNotes", code: "too_long" }]);
        return false;
      }
      setIssues([]);
      return true;
    }

    if (step === "review") {
      const result = validateElderRegisterPayload({
        name: form.name,
        age: form.age,
        phone: form.phone,
        address: form.address,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        healthNotes: form.healthNotes,
        language: locale,
        consentAccepted: form.consentAccepted,
      });
      setIssues(result.issues);
      return Boolean(result.value);
    }

    const draft = {
      name: step === "name" ? form.name : "ok",
      age: step === "age" ? form.age : "70",
      phone: step === "phone" ? form.phone : "91234567",
      address: step === "address" ? form.address : "ok",
      emergencyContactName:
        step === "emergencyContactName" ? form.emergencyContactName : "ok",
      emergencyContactPhone:
        step === "emergencyContactPhone"
          ? form.emergencyContactPhone
          : "91234567",
      healthNotes: form.healthNotes,
      language: locale,
    };

    const result = validateElderProfileInput(draft);
    const relevant = result.issues.filter((issue) => issue.field === step);
    setIssues(relevant);
    return relevant.length === 0;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setForm((current) => {
      if (step === "phone") {
        return { ...current, phone: normalizeHkPhone(current.phone) };
      }
      if (step === "emergencyContactPhone") {
        return {
          ...current,
          emergencyContactPhone: normalizeHkPhone(
            current.emergencyContactPhone,
          ),
        };
      }
      return current;
    });
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  }

  function goBack() {
    setIssues([]);
    setSubmitError(null);
    setStepIndex((index) => Math.max(index - 1, 0));
  }

  async function submit() {
    if (!validateCurrentStep()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await registerElder({
        name: form.name.trim(),
        age: Number(form.age),
        phone: normalizeHkPhone(form.phone),
        address: form.address.trim(),
        emergencyContact: {
          name: form.emergencyContactName.trim(),
          phone: normalizeHkPhone(form.emergencyContactPhone),
        },
        healthNotes: form.healthNotes.trim() ? form.healthNotes.trim() : null,
        language: locale,
        consentAccepted: true,
      });
      writeDeviceKey(result.deviceKey);
      clearDraft();
      router.replace("/");
    } catch (error) {
      const body = error as ApiErrorBody;
      if (body?.issues) {
        setIssues(body.issues as ElderValidationIssue[]);
      }
      setSubmitError(t("submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex flex-1 flex-col gap-5 px-4 pb-10 pt-4">
        <BigText tone="muted">{t("progress", { current: 1, total: STEPS.length })}</BigText>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 pb-10 pt-4">
      <header className="flex flex-col gap-3">
        {!isFirst ? (
          <BigButton variant="neutral" onClick={goBack}>
            {t("backStep")}
          </BigButton>
        ) : null}
        <Suspense fallback={<div className="min-h-[72px]" aria-hidden />}>
          <LanguageSwitcher />
        </Suspense>
      </header>

      <BigText as="p" size="caption" tone="muted">
        {t("progress", { current: stepIndex + 1, total: STEPS.length })}
      </BigText>

      {step === "name" ? (
        <BigField
          id="elder-name"
          label={t("fields.name")}
          value={form.name}
          autoComplete="name"
          onChange={(event) => updateField("name", event.target.value)}
          error={messageFor(stepIssue)}
        />
      ) : null}

      {step === "age" ? (
        <BigField
          id="elder-age"
          label={t("fields.age")}
          value={form.age}
          inputMode="numeric"
          onChange={(event) => updateField("age", event.target.value)}
          error={messageFor(stepIssue)}
        />
      ) : null}

      {step === "phone" ? (
        <BigField
          id="elder-phone"
          label={t("fields.phone")}
          value={form.phone}
          inputMode="tel"
          autoComplete="tel"
          onChange={(event) => updateField("phone", event.target.value)}
          error={messageFor(stepIssue)}
        />
      ) : null}

      {step === "address" ? (
        <BigField
          id="elder-address"
          label={t("fields.address")}
          value={form.address}
          autoComplete="street-address"
          onChange={(event) => updateField("address", event.target.value)}
          error={messageFor(stepIssue)}
        />
      ) : null}

      {step === "emergencyContactName" ? (
        <BigField
          id="elder-emergency-name"
          label={t("fields.emergencyContactName")}
          value={form.emergencyContactName}
          onChange={(event) =>
            updateField("emergencyContactName", event.target.value)
          }
          error={messageFor(stepIssue)}
        />
      ) : null}

      {step === "emergencyContactPhone" ? (
        <BigField
          id="elder-emergency-phone"
          label={t("fields.emergencyContactPhone")}
          value={form.emergencyContactPhone}
          inputMode="tel"
          onChange={(event) =>
            updateField("emergencyContactPhone", event.target.value)
          }
          error={messageFor(stepIssue)}
        />
      ) : null}

      {step === "healthNotes" ? (
        <>
          <BigField
            id="elder-health-notes"
            label={t("fields.healthNotes")}
            value={form.healthNotes}
            multiline
            onChange={(event) => updateField("healthNotes", event.target.value)}
            error={messageFor(stepIssue)}
          />
          <BigText tone="muted">{t("healthNotesHint")}</BigText>
        </>
      ) : null}

      {step === "review" ? (
        <section className="flex flex-col gap-4">
          <BigText as="h1" size="title">
            {t("reviewTitle")}
          </BigText>
          <ReviewRow label={t("fields.name")} value={form.name} />
          <ReviewRow label={t("fields.age")} value={form.age} />
          <ReviewRow label={t("fields.phone")} value={form.phone} />
          <ReviewRow label={t("fields.address")} value={form.address} />
          <ReviewRow
            label={t("fields.emergencyContactName")}
            value={form.emergencyContactName}
          />
          <ReviewRow
            label={t("fields.emergencyContactPhone")}
            value={form.emergencyContactPhone}
          />
          <ReviewRow
            label={t("fields.healthNotes")}
            value={form.healthNotes.trim() ? form.healthNotes : t("skipped")}
          />
          <BigCheckbox
            id="elder-consent"
            checked={form.consentAccepted}
            onChange={(checked) => updateField("consentAccepted", checked)}
            label={t("consentLabel")}
            error={messageFor(firstIssueForField(issues, "consent"))}
          />
        </section>
      ) : null}

      {submitError ? (
        <p role="alert" className="text-[22px] font-bold text-emergency">
          {submitError}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 pt-4">
        {step === "healthNotes" ? (
          <BigButton
            variant="assistSoft"
            onClick={() => {
              updateField("healthNotes", "");
              setIssues([]);
              setStepIndex((index) => index + 1);
            }}
          >
            {t("skip")}
          </BigButton>
        ) : null}

        {isLast ? (
          <BigButton
            variant="assist"
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting ? t("submitting") : t("submit")}
          </BigButton>
        ) : (
          <BigButton variant="assist" onClick={goNext}>
            {t("next")}
          </BigButton>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-surface px-4 py-3">
      <BigText size="caption" tone="muted">
        {label}
      </BigText>
      <BigText>{value}</BigText>
    </div>
  );
}
