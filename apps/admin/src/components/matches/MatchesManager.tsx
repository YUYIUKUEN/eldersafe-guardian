"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PaginationBar } from "@/components/management/PaginationBar";
import { StatusBadge } from "@/components/management/StatusBadge";
import { formatDuration, formatHkDateTime } from "@/lib/management/format";
import type {
  HelpRequestStatus,
  MatchListItem,
} from "@/lib/management/matches";

type ListResponse = {
  items: MatchListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type FilterOptions = {
  elders: Array<{ id: string; name: string }>;
  volunteers: Array<{ id: string; name: string; approvalStatus: string }>;
};

function statusTone(status: HelpRequestStatus) {
  switch (status) {
    case "pending":
      return "warning" as const;
    case "accepted":
      return "neutral" as const;
    case "completed":
      return "success" as const;
    case "cancelled":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

export function MatchesManager() {
  const t = useTranslations("AdminMatches");
  const tMgmt = useTranslations("AdminManagement");
  const locale = useLocale();
  const [status, setStatus] = useState<"all" | HelpRequestStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [elderId, setElderId] = useState("");
  const [volunteerId, setVolunteerId] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const durationLabels = {
    days: t("duration.days"),
    hours: t("duration.hours"),
    minutes: t("duration.minutes"),
    empty: "—",
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      try {
        const res = await fetch("/api/matches/filters");
        if (!res.ok) return;
        const json = (await res.json()) as FilterOptions;
        if (!cancelled) setFilters(json);
      } catch {
        // Filters are optional; list can still load.
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        status,
      });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (elderId) params.set("elderId", elderId);
      if (volunteerId) params.set("volunteerId", volunteerId);
      const res = await fetch(`/api/matches?${params.toString()}`);
      if (!res.ok) throw new Error("load_failed");
      const json = (await res.json()) as ListResponse;
      setData(json);
    } catch {
      setError(t("loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, status, dateFrom, dateTo, elderId, volunteerId, t]);

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
      <form
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          void load();
        }}
      >
        <label className="block text-sm font-semibold text-slate-800">
          {t("filters.status")}
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as typeof status);
            }}
          >
            <option value="all">{t("status.all")}</option>
            <option value="pending">{t("status.pending")}</option>
            <option value="accepted">{t("status.accepted")}</option>
            <option value="completed">{t("status.completed")}</option>
            <option value="cancelled">{t("status.cancelled")}</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          {t("filters.dateFrom")}
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
            value={dateFrom}
            onChange={(e) => {
              setPage(1);
              setDateFrom(e.target.value);
            }}
          />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          {t("filters.dateTo")}
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
            value={dateTo}
            onChange={(e) => {
              setPage(1);
              setDateTo(e.target.value);
            }}
          />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          {t("filters.elder")}
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
            value={elderId}
            onChange={(e) => {
              setPage(1);
              setElderId(e.target.value);
            }}
          >
            <option value="">{t("filters.any")}</option>
            {(filters?.elders ?? []).map((elder) => (
              <option key={elder.id} value={elder.id}>
                {elder.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          {t("filters.volunteer")}
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
            value={volunteerId}
            onChange={(e) => {
              setPage(1);
              setVolunteerId(e.target.value);
            }}
          >
            <option value="">{t("filters.any")}</option>
            {(filters?.volunteers ?? []).map((volunteer) => (
              <option key={volunteer.id} value={volunteer.id}>
                {volunteer.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {tMgmt("applyFilters")}
          </button>
        </div>
      </form>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
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
              <th className="px-3 py-3 font-semibold">{t("columns.status")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.createdAt")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.acceptedAt")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.completedAt")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.waitDuration")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.handleDuration")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-slate-500">
                  {tMgmt("loading")}
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-slate-500">
                  {tMgmt("empty")}
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-100 hover:bg-slate-50/80"
                >
                  <td className="px-3 py-3">
                    <Link
                      href={`/matches/${item.id}`}
                      className="font-semibold text-brand underline-offset-2 hover:underline"
                    >
                      {item.shortId}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{item.elderName}</td>
                  <td className="px-3 py-3 text-slate-700">
                    {item.volunteerName ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      label={t(`status.${item.status}`)}
                      tone={statusTone(item.status)}
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatHkDateTime(item.createdAt, locale)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatHkDateTime(item.acceptedAt, locale)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatHkDateTime(
                      item.completedAt ?? item.cancelledAt,
                      locale,
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatDuration(
                      item.createdAt,
                      item.acceptedAt,
                      durationLabels,
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {item.acceptedAt
                      ? formatDuration(
                          item.acceptedAt,
                          item.completedAt ?? item.cancelledAt,
                          durationLabels,
                        )
                      : "—"}
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
