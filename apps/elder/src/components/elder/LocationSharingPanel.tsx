"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { readDeviceKey } from "@/lib/elder/device-storage";
import { LOCATION_WRITE_INTERVAL_MS } from "@/lib/elder/location-constants";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";

const INACCURATE_METERS = 100;

type LocationSharingPanelProps = {
  helpRequestId?: string;
  emergencyId?: string;
  /** When false, watching stops automatically (request completed / emergency ended). */
  active: boolean;
};

function canUseGeolocation(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

export function LocationSharingPanel({
  helpRequestId,
  emergencyId,
  active,
}: LocationSharingPanelProps) {
  const t = useTranslations("LocationShare");
  const [manualStop, setManualStop] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [lastSentLabel, setLastSentLabel] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastWriteAtRef = useRef(0);
  const writingRef = useRef(false);
  const sharingRef = useRef(false);

  const geoSupported = canUseGeolocation();
  const isSharing = active && !manualStop && geoSupported;
  sharingRef.current = isSharing;

  useEffect(() => {
    if (!isSharing) {
      stopWatch();
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        void handlePosition(position);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setHint(t("denied"));
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setHint(t("unavailable"));
        } else if (error.code === error.TIMEOUT) {
          setHint(t("timeout"));
        } else {
          setHint(t("failed"));
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 20_000,
      },
    );

    return () => {
      stopWatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watch tied to sharing flag + parent ids
  }, [isSharing, helpRequestId, emergencyId, t]);

  function stopWatch() {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  async function handlePosition(position: GeolocationPosition) {
    if (!sharingRef.current) return;

    const accuracy = position.coords.accuracy;
    const inaccurate =
      Number.isFinite(accuracy) && accuracy > INACCURATE_METERS;

    const now = Date.now();
    if (now - lastWriteAtRef.current < LOCATION_WRITE_INTERVAL_MS) {
      if (inaccurate) setHint(t("inaccurate"));
      return;
    }
    if (writingRef.current) return;

    const deviceKey = readDeviceKey();
    if (!deviceKey) {
      setHint(t("failed"));
      return;
    }

    writingRef.current = true;
    try {
      const response = await fetch("/api/elders/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Elder-Device-Key": deviceKey,
        },
        body: JSON.stringify({
          helpRequestId,
          emergencyId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: Number.isFinite(accuracy) ? accuracy : null,
        }),
      });

      const payload = (await response.json()) as {
        skipped?: boolean;
        error?: string;
      };

      if (response.status === 409) {
        stopWatch();
        setManualStop(true);
        setHint(t("autoStopped"));
        return;
      }

      if (!response.ok) {
        setHint(t("failed"));
        return;
      }

      if (!payload.skipped) {
        lastWriteAtRef.current = Date.now();
        setLastSentLabel(t("lastUpdated"));
        setHint(inaccurate ? t("inaccurate") : null);
      }
    } catch {
      setHint(t("failed"));
    } finally {
      writingRef.current = false;
    }
  }

  async function stopSharing() {
    stopWatch();
    setManualStop(true);
    setHint(t("stoppedHint"));

    const deviceKey = readDeviceKey();
    if (!deviceKey) return;
    try {
      await fetch("/api/elders/locations/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Elder-Device-Key": deviceKey,
        },
        body: JSON.stringify({ helpRequestId, emergencyId }),
      });
    } catch {
      // Local stop already applied.
    }
  }

  const statusHint = !active
    ? t("autoStopped")
    : !geoSupported
      ? t("unsupported")
      : hint;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-assist bg-assist-soft px-4 py-5">
      <BigText as="h2" size="title" tone="assist" className="text-center">
        {isSharing ? t("sharingTitle") : t("stoppedTitle")}
      </BigText>

      <BigText className="text-center" size="caption">
        {t("keepOpen")}
      </BigText>

      {lastSentLabel && isSharing ? (
        <BigText className="text-center" tone="muted">
          {lastSentLabel}
        </BigText>
      ) : null}

      {statusHint ? (
        <p
          role="alert"
          className="text-[22px] font-bold leading-snug text-emergency"
        >
          {statusHint}
        </p>
      ) : null}

      {isSharing ? (
        <BigButton variant="neutral" onClick={() => void stopSharing()}>
          {t("stop")}
        </BigButton>
      ) : null}

      {!isSharing && active ? (
        <BigButton
          variant="assist"
          onClick={() => {
            setHint(null);
            setManualStop(false);
          }}
        >
          {t("resume")}
        </BigButton>
      ) : null}
    </section>
  );
}
