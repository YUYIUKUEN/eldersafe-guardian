"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { ElderPublicProfile } from "@eldersafe/shared";
import { fetchElderSession } from "@/lib/elder/api-client";
import {
  clearDeviceKey,
  readDeviceKey,
} from "@/lib/elder/device-storage";
import { useRouter } from "@/i18n/navigation";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

type ElderSessionGateProps = {
  children: (elder: ElderPublicProfile) => React.ReactNode;
  /** When true, missing/invalid key redirects to onboarding. */
  requireSession?: boolean;
};

/** Survives locale remounts so language switch does not stick on "checking". */
const sessionCache = new Map<string, ElderPublicProfile>();

const SESSION_TIMEOUT_MS = 8_000;

export function ElderSessionGate({
  children,
  requireSession = true,
}: ElderSessionGateProps) {
  const t = useTranslations("Elder");
  const router = useRouter();
  const [elder, setElder] = useState<ElderPublicProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function goOnboarding() {
      // Prefer next-intl client navigation so we stay on the ngrok host
      // (full-page redirects can bounce to localhost behind tunnels).
      router.replace("/onboarding");
    }

    async function run() {
      const key = readDeviceKey();
      if (!key) {
        if (requireSession) {
          await goOnboarding();
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
        const session = await Promise.race([
          fetchElderSession(key),
          new Promise<null>((resolve) => {
            window.setTimeout(() => resolve(null), SESSION_TIMEOUT_MS);
          }),
        ]);
        if (!active) return;

        if (!session) {
          clearDeviceKey();
          sessionCache.delete(key);
          if (requireSession) {
            await goOnboarding();
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
          setFailed(true);
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
  }, [requireSession, router]);

  if (failed) {
    return (
      <Page hideLanguageSwitcher>
        <BigText tone="muted">{t("sessionCheckFailed")}</BigText>
        <BigButton
          variant="assist"
          onClick={() => {
            clearDeviceKey();
            router.replace("/onboarding");
          }}
        >
          {t("startOnboarding")}
        </BigButton>
      </Page>
    );
  }

  if (!ready || !elder) {
    return (
      <Page hideLanguageSwitcher>
        <BigText tone="muted">{t("checkingDevice")}</BigText>
        <BigButton
          variant="neutral"
          className="mt-4"
          onClick={() => {
            clearDeviceKey();
            router.replace("/onboarding");
          }}
        >
          {t("startOnboarding")}
        </BigButton>
      </Page>
    );
  }

  return <>{children(elder)}</>;
}
