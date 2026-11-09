"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { readDeviceKey, clearDeviceKey } from "@/lib/elder/device-storage";
import { useRouter } from "@/i18n/navigation";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";
import { ElderSessionGate } from "./ElderSessionGate";
import { LocationSharingPanel } from "./LocationSharingPanel";

const COUNTDOWN_SECONDS = 5;

type EmergencyPayload = {
  id: string;
  status: "active" | "resolved" | "cancelled";
  policeShareToken: string;
  trackPath: string;
  startedAt: string;
  endedAt: string | null;
};

type Phase = "loading" | "countdown" | "active" | "ended" | "error";

function speak(text: string, locale: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale === "zh-HK" ? "zh-HK" : "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function vibratePulse() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
}

function EmergencyContent() {
  const t = useTranslations("Emergency");
  const locale = useLocale();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [emergency, setEmergency] = useState<EmergencyPayload | null>(null);
  const [dialNumber, setDialNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [dialOpened, setDialOpened] = useState(false);

  const cancelledRef = useRef(false);
  const firedRef = useRef(false);
  const countdownSpeechKeyRef = useRef<string | null>(null);

  useEffect(() => {
    cancelledRef.current = false;
    let ignore = false;

    async function boot() {
      const deviceKey = readDeviceKey();
      if (!deviceKey) {
        router.replace("/onboarding");
        return;
      }

      try {
        const response = await fetch("/api/elders/emergencies", {
          headers: { "X-Elder-Device-Key": deviceKey },
        });
        if (response.status === 401) {
          clearDeviceKey();
          router.replace("/onboarding");
          return;
        }
        const payload = (await response.json()) as {
          emergency?: EmergencyPayload | null;
          dialNumber?: string;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "load_failed");
        }
        if (ignore) return;

        if (payload.dialNumber) {
          setDialNumber(payload.dialNumber);
        }

        if (payload.emergency?.status === "active") {
          setEmergency(payload.emergency);
          setPhase("active");
          return;
        }

        setPhase("countdown");
        setSecondsLeft(COUNTDOWN_SECONDS);
      } catch {
        if (!ignore) {
          setError(t("loadFailed"));
          setPhase("error");
        }
      }
    }

    void boot();
    return () => {
      ignore = true;
      cancelledRef.current = true;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [router, t]);

  useEffect(() => {
    if (phase !== "countdown") return;

    const numberLabel = dialNumber ?? "999";
    const speechKey = `start-${locale}-${numberLabel}`;
    if (countdownSpeechKeyRef.current !== speechKey) {
      countdownSpeechKeyRef.current = speechKey;
      speak(t("speechStart", { number: numberLabel }), locale);
      vibratePulse();
    }

    if (secondsLeft <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        void triggerEmergency();
      }
      return;
    }

    speak(
      t("speechCountdown", { seconds: secondsLeft, number: numberLabel }),
      locale,
    );
    vibratePulse();

    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- countdown driven by secondsLeft/phase
  }, [phase, secondsLeft, locale, t, dialNumber]);

  async function readOptionalPosition(): Promise<{
    latitude: number | null;
    longitude: number | null;
  }> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return { latitude: null, longitude: null };
    }
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 10_000,
            timeout: 8_000,
          });
        },
      );
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch {
      return { latitude: null, longitude: null };
    }
  }

  async function triggerEmergency() {
    if (cancelledRef.current) return;

    const deviceKey = readDeviceKey();
    if (!deviceKey) {
      router.replace("/onboarding");
      return;
    }

    speak(t("speechCalling"), locale);
    vibratePulse();

    const coords = await readOptionalPosition();
    if (cancelledRef.current) return;

    try {
      const response = await fetch("/api/elders/emergencies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Elder-Device-Key": deviceKey,
        },
        body: JSON.stringify(coords),
      });

      if (response.status === 401) {
        clearDeviceKey();
        router.replace("/onboarding");
        return;
      }

      const payload = (await response.json()) as {
        emergency?: EmergencyPayload;
        dialNumber?: string;
        error?: string;
      };

      if (!response.ok || !payload.emergency) {
        throw new Error(payload.error ?? "create_failed");
      }

      if (cancelledRef.current) return;

      setEmergency(payload.emergency);
      setDialNumber(payload.dialNumber ?? null);
      setPhase("active");

      if (payload.dialNumber) {
        setDialOpened(true);
        window.location.href = `tel:${payload.dialNumber}`;
      }
    } catch {
      if (!cancelledRef.current) {
        setError(t("createFailed"));
        setPhase("error");
      }
    }
  }

  function cancelCountdown() {
    cancelledRef.current = true;
    firedRef.current = true;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(0);
    }
    router.replace("/");
  }

  async function endEmergency() {
    if (!emergency) return;
    const deviceKey = readDeviceKey();
    if (!deviceKey) {
      router.replace("/onboarding");
      return;
    }

    setEnding(true);
    try {
      const response = await fetch(
        `/api/elders/emergencies/${emergency.id}/end`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Elder-Device-Key": deviceKey,
          },
          body: JSON.stringify({ status: "resolved" }),
        },
      );
      if (response.status === 401) {
        clearDeviceKey();
        router.replace("/onboarding");
        return;
      }
      if (!response.ok && response.status !== 409) {
        throw new Error("end_failed");
      }
      setEmergency((current) =>
        current ? { ...current, status: "resolved" } : current,
      );
      setPhase("ended");
      speak(t("speechEnded"), locale);
    } catch {
      setError(t("endFailed"));
    } finally {
      setEnding(false);
    }
  }

  if (phase === "loading") {
    return (
      <Page hideLanguageSwitcher>
        <BigText tone="muted">{t("loading")}</BigText>
      </Page>
    );
  }

  if (phase === "countdown") {
    const numberLabel = dialNumber ?? "999";
    return (
      <div className="flex min-h-full flex-1 flex-col bg-emergency px-4 py-6 text-emergency-fg">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="text-[28px] font-bold leading-tight">
            {t("countdownTitle", { number: numberLabel })}
          </p>
          <p
            aria-live="assertive"
            className="text-[120px] font-bold leading-none tracking-tight"
          >
            {secondsLeft}
          </p>
          <p className="max-w-[20ch] text-[24px] font-bold leading-snug">
            {t("countdownHint")}
          </p>
        </div>
        <BigButton
          variant="neutral"
          className="min-h-[120px] !border-white !bg-white !text-[32px] !text-emergency"
          onClick={cancelCountdown}
        >
          {t("cancel")}
        </BigButton>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <Page backHref="/">
        <p role="alert" className="text-[22px] font-bold text-emergency">
          {error ?? t("createFailed")}
        </p>
        <BigButton href="/" variant="assist">
          {t("backHome")}
        </BigButton>
      </Page>
    );
  }

  const isActive = phase === "active" && emergency?.status === "active";

  return (
    <Page hideLanguageSwitcher className="bg-emergency-soft">
      <BigText as="h1" size="title" tone="emergency" className="text-center">
        {phase === "ended" ? t("endedTitle") : t("activeTitle")}
      </BigText>

      {isActive ? (
        <p className="text-center text-[26px] font-bold leading-snug text-emergency">
          {t("pressCall")}
        </p>
      ) : null}

      {dialOpened && dialNumber ? (
        <BigText className="text-center" tone="muted">
          {t("dialHint", { number: dialNumber })}
        </BigText>
      ) : null}

      {emergency ? (
        <LocationSharingPanel
          emergencyId={emergency.id}
          active={isActive}
        />
      ) : null}

      {error ? (
        <p role="alert" className="text-[22px] font-bold text-emergency">
          {error}
        </p>
      ) : null}

      {isActive ? (
        <BigButton
          variant="assist"
          className="min-h-[110px] text-[28px]"
          disabled={ending}
          onClick={() => void endEmergency()}
        >
          {ending ? t("ending") : t("imSafe")}
        </BigButton>
      ) : (
        <BigButton href="/" variant="assist">
          {t("backHome")}
        </BigButton>
      )}
    </Page>
  );
}

export function EmergencyScreen() {
  return (
    <ElderSessionGate>
      {() => <EmergencyContent />}
    </ElderSessionGate>
  );
}
