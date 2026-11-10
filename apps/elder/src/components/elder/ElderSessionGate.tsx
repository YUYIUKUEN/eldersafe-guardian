"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { ElderPublicProfile } from "@eldersafe/shared";
import { fetchElderSession } from "@/lib/elder/api-client";
import {
  clearDeviceKey,
  readDeviceKey,
} from "@/lib/elder/device-storage";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

type ElderSessionGateProps = {
  children: (elder: ElderPublicProfile) => React.ReactNode;
  /** When true, missing/invalid key redirects to onboarding. */
  requireSession?: boolean;
};

/** Survives locale remounts so language switch does not stick on "checking". */
const sessionCache = new Map<string, ElderPublicProfile>();

export function ElderSessionGate({
  children,
  requireSession = true,
}: ElderSessionGateProps) {
  const t = useTranslations("Elder");
  const [elder, setElder] = useState<ElderPublicProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function run() {
      const key = readDeviceKey();
      if (!key) {
        if (requireSession) {
          window.location.replace("/onboarding");
          return;
        }
        if (active) {
          setElder(null);
          setReady(true);
        }
        return;
      }

      const cached = sessionCache.get(key);
      if (cached && active) {
        setElder(cached);
        setReady(true);
      }

      try {
        const session = await fetchElderSession(key);
        if (!active) return;

        if (!session) {
          clearDeviceKey();
          sessionCache.delete(key);
          if (requireSession) {
            window.location.replace("/onboarding");
            return;
          }
          setElder(null);
          setReady(true);
          return;
        }

        sessionCache.set(key, session.elder);
        setElder(session.elder);
        setReady(true);
      } catch {
        if (!active) return;
        // Keep cached profile across transient failures / locale switches.
        if (cached) {
          setElder(cached);
          setReady(true);
          return;
        }
        if (requireSession) {
          window.location.replace("/onboarding");
          return;
        }
        setElder(null);
        setReady(true);
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [requireSession]);

  if (!ready || !elder) {
    return (
      <Page hideLanguageSwitcher>
        <BigText tone="muted">{t("checkingDevice")}</BigText>
      </Page>
    );
  }

  return <>{children(elder)}</>;
}
