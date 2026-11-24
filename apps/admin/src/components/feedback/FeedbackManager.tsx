"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PaginationBar } from "@/components/management/PaginationBar";
import { SentimentBadge } from "@/components/management/SentimentBadge";
import { formatHkDateTime } from "@/lib/management/format";
import type { FeedbackListItem } from "@/lib/management/feedback";

type ListResponse = {
  items: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type SentimentFilter =
  | "all"
  | "positive"
  | "negative"
  | "neutral"
  | "needs_follow_up";

export function FeedbackManager() {
  const t = useTranslations("AdminFeedback");
  const tMgmt = useTranslations("AdminManagement");
  const locale = useLocale();
  const [sentiment, setSentiment] = useState<SentimentFilter>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        sentiment,
      });
      const res = await fetch(`/api/feedback?${params.toString()}`);
      if (!res.ok) throw new Error("load_failed");
      setData((await res.json()) as ListResponse);
    } catch {
      setError(t("loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, sentiment, t]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block text-sm font-semibold text-slate-800 sm:w-64">
          {t("filterLabel")}
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
            value={sentiment}
            onChange={(e) => {
              setPage(1);
              setSentiment(e.target.value as SentimentFilter);
            }}
          >
            <option value="all">{t("filters.all")}</option>
            <option value="needs_follow_up">{t("filters.needsFollowUp")}</option>
            <option value="positive">{t("filters.positive")}</option>
            <option value="neutral">{t("filters.neutral")}</option>
            <option value="negative">{t("filters.negative")}</option>
          </select>
        </label>
        <p className="text-sm text-slate-600">{t("hint")}</p>
      </div>

      {error ? (
        <p
          className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-3 font-semibold">{t("columns.id")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.elder")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.volunteer")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.rating")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.sentiment")}</th>
              <th className="px-3 py-3 font-semibold">
                {t("columns.confirmedAt")}
              </th>
              <th className="px-3 py-3 font-semibold">{t("columns.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-slate-500">
                  {tMgmt("loading")}
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-slate-500">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
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
                    {item.volunteerId ? (
                      <Link
                        href={`/volunteers/${item.volunteerId}`}
                        className="font-semibold text-brand underline-offset-2 hover:underline"
                      >
                        {item.volunteerName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {item.elderRating != null
                      ? t("starsValue", { count: item.elderRating })
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <SentimentBadge
                      sentiment={item.sentiment}
                      rating={item.elderRating}
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatHkDateTime(item.elderConfirmedAt, locale)}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {data ? (
        <PaginationBar
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
