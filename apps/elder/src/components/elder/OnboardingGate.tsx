"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { fetchElderSession } from "@/lib/elder/api-client";
import { clearDeviceKey, readDeviceKey } from "@/lib/elder/device-storage";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

/** If a valid device key already exists, skip onboarding and go home. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Elder");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function run() {
      const key = readDeviceKey();
      if (!key) {
        if (active) setReady(true);
        return;
      }

      try {
        const session = await fetchElderSession(key);
        if (!active) return;
        if (session) {
          window.location.replace("/");
          return;
        }
        clearDeviceKey();
      } catch {
        // Stay on onboarding if session check fails unexpectedly.
      }

      if (active) setReady(true);
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <Page hideLanguageSwitcher>
        <BigText tone="muted">{t("checkingDevice")}</BigText>
      </Page>
    );
  }

  return <>{children}</>;
}
