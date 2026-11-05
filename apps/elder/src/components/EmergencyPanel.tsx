"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createEmergencyEvent,
  createLogger,
  updateEmergencyLocation,
  type StoredElderProfile,
  type StoredEmergencyEvent,
} from "@eldersafe/shared";
import { getEmergencyTelHref } from "@/lib/emergency-phone";
import { getCurrentPosition, watchPosition } from "@/lib/geolocation";

type EmergencyPanelProps = {
  profile: StoredElderProfile;
  onClose: () => void;
};

const log = createLogger("elder-emergency");

export function EmergencyPanel({ profile, onClose }: EmergencyPanelProps) {
  const t = useTranslations("ElderEmergency");
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [phase, setPhase] = useState<"countdown" | "active">("countdown");
  const [event, setEvent] = useState<StoredEmergencyEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const cancelledRef = useRef(false);
  const triggeredRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  const policeUrl = useMemo(() => {
    if (!event || typeof window === "undefined") return "";
    return `${window.location.origin}/police/${event.policeShareToken}`;
  }, [event]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (secondsLeft <= 0) {
      void triggerEmergency();
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [phase, secondsLeft]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  async function triggerEmergency() {
    if (cancelledRef.current || triggeredRef.current) return;
    triggeredRef.current = true;
    setPhase("active");

    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const point = await getCurrentPosition();
      latitude = point.latitude;
      longitude = point.longitude;
    } catch {
      setLocationError(true);
    }

    const created = createEmergencyEvent({
      deviceKey: profile.deviceKey,
      elderName: profile.name,
      latitude,
      longitude,
    });
    setEvent(created);
    log.info("emergency created", {
      actorType: "elder",
      actorId: profile.deviceKey,
      metadata: { emergencyId: created.id, notifiedAdmin: true },
    });

    try {
      window.location.href = getEmergencyTelHref();
    } catch (error) {
      log.error("failed to open dialler", {
        actorType: "elder",
        metadata: { error: String(error) },
      });
    }

    const watchId = watchPosition((point) => {
      updateEmergencyLocation(
        created.policeShareToken,
        point.latitude,
        point.longitude,
      );
    });
    watchIdRef.current = watchId;
  }

  function cancel() {
    cancelledRef.current = true;
    onClose();
  }

  async function copyLink() {
    if (!policeUrl) return;
    await navigator.clipboard.writeText(policeUrl);
    setCopied(true);
  }

  if (phase === "countdown") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-8 py-6 text-center">
        <h1 className="text-[28px] font-bold text-red-700">{t("title")}</h1>
        <p className="text-[22px] text-slate-800">{t("countdown")}</p>
        <p className="text-7xl font-black text-red-700">
          {t("seconds", { count: secondsLeft })}
        </p>
        <button
          type="button"
          onClick={cancel}
          className="min-h-20 w-full max-w-md rounded-2xl bg-slate-800 px-6 text-[28px] font-bold text-white"
        >
          {t("cancel")}
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-5 py-6">
      <h1 className="text-[28px] font-bold text-red-700">{t("title")}</h1>
      <p className="text-[20px] text-slate-800">{t("calling")}</p>
      <p className="text-[20px] font-semibold text-slate-900">{t("created")}</p>
      <p className="text-[20px] text-slate-800">{t("locationSharing")}</p>
      {locationError ? (
        <p className="text-[20px] text-red-700">{t("locationDenied")}</p>
      ) : null}
      {policeUrl ? (
        <div className="space-y-3 rounded-2xl border-2 border-slate-300 bg-white p-4">
          <p className="text-[20px] font-semibold">{t("policeLink")}</p>
          <p className="break-all text-[18px] text-slate-700">{policeUrl}</p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="min-h-14 w-full rounded-xl bg-slate-900 text-[20px] font-bold text-white"
          >
            {copied ? t("copied") : t("copyLink")}
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        className="min-h-16 rounded-2xl bg-brand text-[22px] font-bold text-white"
      >
        {t("backHome")}
      </button>
    </section>
  );
}
