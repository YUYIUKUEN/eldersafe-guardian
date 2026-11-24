"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";

type EmergencyAlertBannerProps = {
  initialActiveCount: number;
};

const TITLE_FLASH_MS = 900;

export function EmergencyAlertBanner({
  initialActiveCount,
}: EmergencyAlertBannerProps) {
  const t = useTranslations("AdminDashboard");
  const [delta, setDelta] = useState(0);
  const [hasNewEvent, setHasNewEvent] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  const baseTitleRef = useRef("");
  const titleFlashRef = useRef<number | null>(null);

  const activeCount = Math.max(0, initialActiveCount + delta);

  const stopTitleFlash = useCallback(() => {
    if (titleFlashRef.current) {
      window.clearInterval(titleFlashRef.current);
      titleFlashRef.current = null;
    }
    if (typeof document !== "undefined" && baseTitleRef.current) {
      document.title = baseTitleRef.current;
    }
  }, []);

  const startTitleFlash = useCallback(
    (alertText: string) => {
      stopTitleFlash();
      let showAlert = true;
      titleFlashRef.current = window.setInterval(() => {
        document.title = showAlert ? alertText : baseTitleRef.current;
        showAlert = !showAlert;
      }, TITLE_FLASH_MS);
    },
    [stopTitleFlash],
  );

  const showDesktopNotification = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(t("emergencyAlert"), {
        body: t("emergencyAlertNew"),
      });
    } catch {
      // Ignore if notifications are blocked at runtime.
    }
  }, [t]);

  const onNewEmergencyInsert = useCallback(() => {
    startTitleFlash(t("emergencyAlert"));
    showDesktopNotification();
  }, [showDesktopNotification, startTitleFlash, t]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      baseTitleRef.current = document.title;
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifyPermission(Notification.permission);
    } else {
      setNotifyPermission("unsupported");
    }
    return () => {
      stopTitleFlash();
    };
  }, [stopTitleFlash]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-dashboard-emergencies")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "emergencies" },
        () => {
          setHasNewEvent(true);
          setDismissed(false);
          setDelta((value) => value + 1);
          onNewEmergencyInsert();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "emergencies" },
        (payload) => {
          const next = payload.new as { status?: string };
          const prev = payload.old as { status?: string };
          if (next.status === "active" && prev.status !== "active") {
            setHasNewEvent(true);
            setDismissed(false);
            setDelta((value) => value + 1);
          }
          if (next.status !== "active" && prev.status === "active") {
            setDelta((value) => value - 1);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onNewEmergencyInsert]);

  async function requestDesktopNotify() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifyPermission(result);
    if (result === "granted") {
      showDesktopNotification();
    }
  }

  function dismissAlert() {
    setDismissed(true);
    setHasNewEvent(false);
    stopTitleFlash();
  }

  const visible = !dismissed && (hasNewEvent || activeCount > 0);
  if (!visible) return null;

  return (
    <div
      className={`rounded-xl border-2 border-red-600 bg-red-600 px-4 py-4 text-white shadow-lg shadow-red-900/20 ${
        hasNewEvent ? "animate-pulse" : ""
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-lg font-bold tracking-tight">{t("emergencyAlert")}</p>
          <p className="text-sm text-red-50">
            {hasNewEvent
              ? t("emergencyAlertNew")
              : t("emergencyAlertActive", { count: activeCount })}
          </p>
          {notifyPermission === "default" ? (
            <p className="text-sm text-red-50/90">{t("desktopNotifyBody")}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/emergencies"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            {t("viewEmergencies")}
          </Link>
          {notifyPermission === "default" ? (
            <button
              type="button"
              onClick={() => void requestDesktopNotify()}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/60 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              {t("enableDesktopNotify")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismissAlert}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/60 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            {t("dismissAlert")}
          </button>
        </div>
      </div>
    </div>
  );
}