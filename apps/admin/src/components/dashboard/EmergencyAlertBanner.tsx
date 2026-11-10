"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";

type EmergencyAlertBannerProps = {
  initialActiveCount: number;
};

export function EmergencyAlertBanner({
  initialActiveCount,
}: EmergencyAlertBannerProps) {
  const t = useTranslations("AdminDashboard");
  const [delta, setDelta] = useState(0);
  const [hasNewEvent, setHasNewEvent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const activeCount = Math.max(0, initialActiveCount + delta);

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
  }, []);

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
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/emergencies"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            {t("viewEmergencies")}
          </Link>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              setHasNewEvent(false);
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/60 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            {t("dismissAlert")}
          </button>
        </div>
      </div>
    </div>
  );
}
