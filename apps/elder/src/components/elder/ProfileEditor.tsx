"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type {
  AppLocale,
  ElderPublicProfile,
  ElderValidationIssue,
} from "@eldersafe/shared";
import {
  normalizeHkPhone,
  validateElderProfileInput,
} from "@eldersafe/shared";
import { updateElderProfile, type ApiErrorBody } from "@/lib/elder/api-client";
import { clearDeviceKey } from "@/lib/elder/device-storage";
import {
  firstIssueForField,
  useElderValidationMessage,
} from "@/lib/elder/validation-messages";
import { useRouter } from "@/i18n/navigation";
import { BigButton } from "@/components/ui/BigButton";
import { BigField } from "@/components/ui/BigField";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

type FormState = {
  name: string;
  age: string;
  phone: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  healthNotes: string;
};

export function ProfileEditor({ elder }: { elder: ElderPublicProfile }) {
  const t = useTranslations("Profile");
  const tOnboarding = useTranslations("Onboarding");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const messageFor = useElderValidationMessage();

  const [form, setForm] = useState<FormState>(() => fromElder(elder));
  const [issues, setIssues] = useState<ElderValidationIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setIssues([]);
    setError(null);
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const validated = validateElderProfileInput({
      name: form.name,
      age: form.age,
      phone: form.phone,
      address: form.address,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
      healthNotes: form.healthNotes,
      language: locale,
    });

    if (!validated.value) {
      setIssues(validated.issues);
      setSaving(false);
      return;
    }

    try {
      const result = await updateElderProfile(validated.value);
      setForm(fromElder(result.elder));
      setIssues([]);
      setSaved(true);
    } catch (err) {
      const body = err as ApiErrorBody;
      if (body?.issues) {
        setIssues(body.issues as ElderValidationIssue[]);
      } else if (body?.error === "unauthorized") {
        clearDeviceKey();
        router.replace("/onboarding");
        return;
      }
      setError(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page backHref="/">
      <BigText as="h1" size="title" tone="brand">
        {t("title")}
      </BigText>
      <BigText tone="muted">{t("subtitle")}</BigText>

      <BigField
        id="profile-name"
        label={tOnboarding("fields.name")}
        value={form.name}
        onChange={(event) => updateField("name", event.target.value)}
        error={messageFor(firstIssueForField(issues, "name"))}
      />
      <BigField
        id="profile-age"
        label={tOnboarding("fields.age")}
        value={form.age}
        inputMode="numeric"
        onChange={(event) => updateField("age", event.target.value)}
        error={messageFor(firstIssueForField(issues, "age"))}
      />
      <BigField
        id="profile-phone"
        label={tOnboarding("fields.phone")}
        value={form.phone}
        inputMode="tel"
        onChange={(event) => updateField("phone", event.target.value)}
        error={messageFor(firstIssueForField(issues, "phone"))}
      />
      <BigField
        id="profile-address"
        label={tOnboarding("fields.address")}
        value={form.address}
        onChange={(event) => updateField("address", event.target.value)}
        error={messageFor(firstIssueForField(issues, "address"))}
      />
      <BigField
        id="profile-emergency-name"
        label={tOnboarding("fields.emergencyContactName")}
        value={form.emergencyContactName}
        onChange={(event) =>
          updateField("emergencyContactName", event.target.value)
        }
        error={messageFor(firstIssueForField(issues, "emergencyContactName"))}
      />
      <BigField
        id="profile-emergency-phone"
        label={tOnboarding("fields.emergencyContactPhone")}
        value={form.emergencyContactPhone}
        inputMode="tel"
        onChange={(event) =>
          updateField("emergencyContactPhone", event.target.value)
        }
        error={messageFor(firstIssueForField(issues, "emergencyContactPhone"))}
      />
      <BigField
        id="profile-health-notes"
        label={tOnboarding("fields.healthNotes")}
        value={form.healthNotes}
        multiline
        onChange={(event) => updateField("healthNotes", event.target.value)}
        error={messageFor(firstIssueForField(issues, "healthNotes"))}
      />

      {error ? (
        <p role="alert" className="text-[22px] font-bold text-emergency">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-[22px] font-bold text-assist">{t("saved")}</p>
      ) : null}

      <BigButton
        variant="assist"
        disabled={saving}
        onClick={() => void onSave()}
      >
        {saving ? t("saving") : t("save")}
      </BigButton>
    </Page>
  );
}

function fromElder(elder: ElderPublicProfile): FormState {
  return {
    name: elder.name,
    age: String(elder.age),
    phone: normalizeHkPhone(elder.phone),
    address: elder.address,
    emergencyContactName: elder.emergencyContact.name,
    emergencyContactPhone: normalizeHkPhone(elder.emergencyContact.phone),
    healthNotes: elder.healthNotes ?? "",
  };
}
