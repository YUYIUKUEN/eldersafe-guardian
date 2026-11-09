"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  isAwaitingElderConfirm,
  serviceHoursBetween,
  volunteerDisplayStatus,
  type VolunteerHelpFeedItem,
} from "@eldersafe/shared";
import { Link } from "@/i18n/navigation";

function formatHours(hours: number, locale: string): string {
  const value = Math.round(hours * 10) / 10;
  if (locale.startsWith("zh")) {
    return `${value} 小時`;
  }
  return `${value} h`;
}

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

export function RecordsScreen() {
  const t = useTranslations("VolunteerRecords");
  const tHelp = useTranslations("VolunteerHelp");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceCount, setServiceCount] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [history, setHistory] = useState<VolunteerHelpFeedItem[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/volunteers/records", {
            cache: "no-store",
          });
          const payload = (await response.json().catch(() => ({}))) as {
            serviceCount?: number;
            totalHours?: number;
            history?: VolunteerHelpFeedItem[];
          };
          if (!response.ok) {
            setError(t("loadFailed"));
            return;
          }
          setServiceCount(payload.serviceCount ?? 0);
          setTotalHours(payload.totalHours ?? 0);
          setHistory(payload.history ?? []);
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
          <p className="text-sm font-semibold text-slate-600">{t("serviceCount")}</p>
          <p className="mt-1 text-3xl font-bold text-brand">{serviceCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-600">{t("totalHours")}</p>
          <p className="mt-1 text-3xl font-bold text-brand">
            {formatHours(totalHours, locale)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{t("hoursHint")}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">{t("historyTitle")}</h2>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center text-base text-slate-600">
            {t("empty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => {
              const display = volunteerDisplayStatus(item);
              const hours = serviceHoursBetween(
                item.acceptedAt,
                item.completedAt,
              );
              return (
                <li key={item.id}>
                  <Link
                    href={`/help-requests/${item.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          {tHelp("elderLine", {
                            name: item.elderName,
                            age: item.elderAge,
                          })}
                        </p>
                        <p className="mt-1 text-sm font-medium text-brand">
                          {tHelp(`status.${display}`)}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600">
                        {formatWhen(
                          item.completedAt ?? item.acceptedAt ?? item.createdAt,
                          locale,
                        )}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      {hours != null
                        ? t("rowHours", { hours: formatHours(hours, locale) })
                        : t("rowHoursUnknown")}
                      {isAwaitingElderConfirm(item)
                        ? ` · ${t("awaitingNote")}`
                        : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
