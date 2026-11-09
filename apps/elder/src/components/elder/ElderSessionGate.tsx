"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { ElderPublicProfile } from "@eldersafe/shared";
import { fetchElderSession } from "@/lib/elder/api-client";
import {
  clearDeviceKey,
  readDeviceKey,
} from "@/lib/elder/device-storage";
import { usePathname, useRouter } from "@/i18n/navigation";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

type ElderSessionGateProps = {
  children: (elder: ElderPublicProfile) => React.ReactNode;
  /** When true, missing/invalid key redirects to onboarding. */
  requireSession?: boolean;
};

export function ElderSessionGate({
  children,
  requireSession = true,
}: ElderSessionGateProps) {
  const t = useTranslations("Elder");
  const router = useRouter();
  const pathname = usePathname();
  const [elder, setElder] = useState<ElderPublicProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const key = readDeviceKey();
      if (!key) {
        if (requireSession && pathname !== "/onboarding") {
          router.replace("/onboarding");
          return;
        }
        if (!cancelled) {
          setElder(null);
          setReady(true);
        }
        return;
      }

      try {
        const session = await fetchElderSession(key);
        if (cancelled) return;
        if (!session) {
          clearDeviceKey();
          if (requireSession) {
            router.replace("/onboarding");
            return;
          }
          setElder(null);
          setReady(true);
          return;
        }

        if (pathname === "/onboarding") {
          router.replace("/");
          return;
        }

        setElder(session.elder);
        setReady(true);
      } catch {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [pathname, requireSession, router]);

  if (!ready || !elder) {
    return (
      <Page hideLanguageSwitcher>
        <BigText tone="muted">{t("checkingDevice")}</BigText>
      </Page>
    );
  }

  return <>{children(elder)}</>;
}
