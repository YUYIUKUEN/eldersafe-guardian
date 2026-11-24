"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SentimentBadge } from "@/components/management/SentimentBadge";
import { StatusBadge } from "@/components/management/StatusBadge";
import { formatHkDateTime } from "@/lib/management/format";
import type { EngagementCaseItem } from "@/lib/management/engagement-cases";

type CasesResponse = {
  volunteer: { id: string; name: string };
  cases: EngagementCaseItem[];
};

type VolunteerCasesPanelProps = {
  volunteerId: string;
};

function helpStatusKey(status: string) {
  if (
    status === "pending" ||
    status === "accepted" ||
    status === "completed" ||
    status === "cancelled"
  ) {
    return status;
  }
  return null;
}

export function VolunteerCasesPanel({ volunteerId }: VolunteerCasesPanelProps) {
  const t = useTranslations("AdminEngagement");
  const tMgmt = useTranslations("AdminManagement");
  const locale = useLocale();
  const [data, setData] = useState<CasesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/engagement/volunteers/${volunteerId}/cases`,
      );
      if (!res.ok) throw new Error("load_failed");
      setData((await res.json()) as CasesResponse);
    } catch {
      setError(t("casesLoadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [volunteerId, t]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (loading) {
    return <p className="text-sm text-slate-600">{tMgmt("loading")}</p>;
  }

  if (!data) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
        {error ?? t("casesLoadFailed")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href="/activity"
          className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
        >
          {t("backToRanking")}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-brand">
          {t("casesTitle", { name: data.volunteer.name })}
        </h1>
        <p className="max-w-2xl text-base text-slate-700">{t("casesSubtitle")}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-3 font-semibold">{t("caseColumns.id")}</th>
              <th className="px-3 py-3 font-semibold">{t("caseColumns.elder")}</th>
              <th className="px-3 py-3 font-semibold">
                {t("caseColumns.status")}
              </th>
              <th className="px-3 py-3 font-semibold">
                {t("caseColumns.createdAt")}
              </th>
              <th className="px-3 py-3 font-semibold">
                {t("caseColumns.feedback")}
              </th>
              <th className="px-3 py-3 font-semibold">
                {t("caseColumns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.cases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-slate-500">
                  {t("casesEmpty")}
                </td>
              </tr>
            ) : (
              data.cases.map((item) => {
                const statusKey = helpStatusKey(item.status);
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-slate-100 hover:bg-slate-50/80 ${
                      item.needsFollowUp ? "bg-red-50/40" : ""
                    }`}
                  >
                    <td className="px-3 py-3 font-mono text-slate-700">
                      {item.shortId}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/elders/${item.elderId}`}
                        className="font-semibold text-brand underline-offset-2 hover:underline"
                      >
                        {item.elderName}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        label={
                          statusKey
                            ? tMgmt(`helpStatus.${statusKey}`)
                            : item.status
                        }
                      />
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatHkDateTime(item.createdAt, locale)}
                    </td>
                    <td className="px-3 py-3">
                      {item.elderConfirmedAt ? (
                        <div className="space-y-1">
                          <SentimentBadge
                            sentiment={item.sentiment}
                            rating={item.elderRating}
                          />
                          {item.needsFollowUp ? (
                            <p className="text-xs font-medium text-red-700">
                              {t("needsFollowUp")}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-500">
                          {t("feedbackPending")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/matches/${item.id}`}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        {t("openCase")}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
