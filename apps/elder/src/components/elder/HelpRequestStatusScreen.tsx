"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { readDeviceKey, clearDeviceKey } from "@/lib/elder/device-storage";
import { useRouter } from "@/i18n/navigation";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

type HelpRequestStatus = "pending" | "accepted" | "completed" | "cancelled";

export function HelpRequestStatusScreen({ id }: { id: string }) {
  const t = useTranslations("VoiceAssist");
  const tElder = useTranslations("Elder");
  const router = useRouter();
  const [status, setStatus] = useState<HelpRequestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const deviceKey = readDeviceKey();
      if (!deviceKey) {
        router.replace("/onboarding");
        return;
      }

      try {
        const response = await fetch(`/api/elders/help-requests/${id}`, {
          headers: { "X-Elder-Device-Key": deviceKey },
        });
        if (response.status === 401) {
          clearDeviceKey();
          router.replace("/onboarding");
          return;
        }
        const payload = (await response.json()) as {
          helpRequest?: { status: HelpRequestStatus };
          error?: string;
        };
        if (!response.ok || !payload.helpRequest) {
          throw new Error(payload.error ?? "not_found");
        }
        if (!cancelled) {
          setStatus(payload.helpRequest.status);
        }
      } catch {
        if (!cancelled) {
          setError(t("statusLoadFailed"));
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, router, t]);

  return (
    <Page backHref="/">
      <BigText as="h1" size="title" tone="brand" className="text-center">
        {t("statusTitle")}
      </BigText>

      {!status && !error ? (
        <BigText className="text-center" tone="muted">
          {tElder("checkingDevice")}
        </BigText>
      ) : null}

      {error ? (
        <p role="alert" className="text-[22px] font-bold text-emergency">
          {error}
        </p>
      ) : null}

      {status ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <BigText size="title" tone="assist">
            {t(`status.${status}`)}
          </BigText>
          <BigText tone="muted">{t("statusHint")}</BigText>
          <BigButton href="/" variant="assist">
            {t("backHome")}
          </BigButton>
        </section>
      ) : null}
    </Page>
  );
}
