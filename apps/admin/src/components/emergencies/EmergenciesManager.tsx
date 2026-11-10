"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PaginationBar } from "@/components/management/PaginationBar";
import { StatusBadge } from "@/components/management/StatusBadge";
import { formatHkDateTime } from "@/lib/management/format";
import type {
  EmergencyListItem,
  EmergencyStatus,
} from "@/lib/management/emergencies";

type ListResponse = {
  items: EmergencyListItem[];
  total: number;
  page: number;
  pageSize: number;
};

function statusTone(status: EmergencyStatus) {
  switch (status) {
    case "active":
      return "danger" as const;
    case "resolved":
      return "success" as const;
    case "cancelled":
      return "neutral" as const;
    default:
      return "neutral" as const;
  }
}

export function EmergenciesManager() {
  const t = useTranslations("AdminEmergencies");
  const tMgmt = useTranslations("AdminManagement");
  const locale = useLocale();
  const [status, setStatus] = useState<"all" | EmergencyStatus>("all");
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
        status,
      });
      const res = await fetch(`/api/emergencies?${params.toString()}`);
      if (!res.ok) throw new Error("load_failed");
      const json = (await res.json()) as ListResponse;
      setData(json);
    } catch {
      setError(t("loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, status, t]);

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
        <label className="block text-sm font-semibold text-slate-800 sm:w-56">
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
            <option value="active">{t("status.active")}</option>
            <option value="resolved">{t("status.resolved")}</option>
            <option value="cancelled">{t("status.cancelled")}</option>
          </select>
        </label>
        <p className="text-sm text-slate-600">{t("activeOnTopHint")}</p>
      </div>

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
              <th className="px-3 py-3 font-semibold">{t("columns.status")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.startedAt")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.endedAt")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-slate-500">
                  {tMgmt("loading")}
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-slate-500">
                  {tMgmt("empty")}
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-t border-slate-100 hover:bg-slate-50/80 ${
                    item.status === "active" ? "bg-red-50/60" : ""
                  }`}
                >
                  <td className="px-3 py-3">
                    <Link
                      href={`/emergencies/${item.id}`}
                      className="font-semibold text-brand underline-offset-2 hover:underline"
                    >
                      {item.shortId}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{item.elderName}</td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      label={t(`status.${item.status}`)}
                      tone={statusTone(item.status)}
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatHkDateTime(item.startedAt, locale)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatHkDateTime(item.endedAt, locale)}
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
