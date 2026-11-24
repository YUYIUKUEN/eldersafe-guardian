"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type PointsEntry = {
  helpRequestId: string;
  points: number;
  createdAt: string;
};

type PointsPayload = {
  totalPoints?: number;
  monthPoints?: number;
  yearMonth?: string;
  recent?: PointsEntry[];
};

function formatWhen(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-HK" : "zh-HK", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PointsScreen() {
  const t = useTranslations("VolunteerPoints");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [monthPoints, setMonthPoints] = useState(0);
  const [yearMonth, setYearMonth] = useState<string>("");
  const [recent, setRecent] = useState<PointsEntry[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/volunteers/points", {
            cache: "no-store",
          });
          const payload = (await response.json().catch(() => ({}))) as PointsPayload;
          if (!response.ok) {
            setError(t("loadFailed"));
            return;
          }
          setTotalPoints(payload.totalPoints ?? 0);
          setMonthPoints(payload.monthPoints ?? 0);
          setYearMonth(payload.yearMonth ?? "");
          setRecent(payload.recent ?? []);
          setError(null);
        } catch {
          setError(t("loadFailed"));
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [t]);

  if (loading) {
    return <p className="text-base text-slate-600">{t("loading")}</p>;
  }
  if (error) {
    return (
      <p className="text-base font-medium text-red-700" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-600">{t("totalPoints")}</p>
          <p className="mt-1 text-3xl font-bold text-brand">{totalPoints}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-600">{t("monthPoints")}</p>
          <p className="mt-1 text-3xl font-bold text-brand">{monthPoints}</p>
          {yearMonth ? (
            <p className="mt-1 text-xs text-slate-500">
              {t("monthLabel", { month: yearMonth })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">{t("recentTitle")}</h2>
        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center text-base text-slate-600">
            {t("empty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {recent.map((entry) => (
              <li key={`${entry.helpRequestId}-${entry.createdAt}`}>
                <Link
                  href={`/help-requests/${entry.helpRequestId}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-lg font-bold text-brand">
                      {t("entryPoints", { points: entry.points })}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatWhen(entry.createdAt, locale)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {t("openRequest")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}