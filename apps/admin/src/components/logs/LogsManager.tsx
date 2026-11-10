"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PaginationBar } from "@/components/management/PaginationBar";
import { formatHkDateTime } from "@/lib/management/format";
import type {
  ActionCategory,
  ActorType,
  LogListItem,
} from "@/lib/management/logs";

type ListResponse = {
  items: LogListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function LogsManager() {
  const t = useTranslations("AdminLogs");
  const tMgmt = useTranslations("AdminManagement");
  const locale = useLocale();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actorType, setActorType] = useState<"all" | ActorType>("all");
  const [actionCategory, setActionCategory] =
    useState<ActionCategory>("all");
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
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
        actorType,
        actionCategory,
      });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (q) params.set("q", q);
      const res = await fetch(`/api/logs?${params.toString()}`);
      if (!res.ok) throw new Error("load_failed");
      setData((await res.json()) as ListResponse);
    } catch {
      setError(t("loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, actorType, actionCategory, dateFrom, dateTo, q, t]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const exportHref = `/api/logs/export?${new URLSearchParams({
    actorType,
    actionCategory,
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(q ? { q } : {}),
  }).toString()}`;

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        {t("appendOnlyHint")}
      </p>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form
          className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQ(draftQ.trim());
          }}
        >
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
            {t("filters.actorType")}
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
              value={actorType}
              onChange={(e) => {
                setPage(1);
                setActorType(e.target.value as typeof actorType);
              }}
            >
              <option value="all">{t("actorType.all")}</option>
              <option value="elder">{t("actorType.elder")}</option>
              <option value="volunteer">{t("actorType.volunteer")}</option>
              <option value="admin">{t("actorType.admin")}</option>
              <option value="system">{t("actorType.system")}</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            {t("filters.actionCategory")}
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
              value={actionCategory}
              onChange={(e) => {
                setPage(1);
                setActionCategory(e.target.value as ActionCategory);
              }}
            >
              <option value="all">{t("category.all")}</option>
              <option value="elder">{t("category.elder")}</option>
              <option value="volunteer">{t("category.volunteer")}</option>
              <option value="admin">{t("category.admin")}</option>
              <option value="help">{t("category.help")}</option>
              <option value="emergency">{t("category.emergency")}</option>
              <option value="auth">{t("category.auth")}</option>
              <option value="other">{t("category.other")}</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            {t("filters.keyword")}
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder={t("keywordPlaceholder")}
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 sm:col-span-2 xl:col-span-5 xl:w-fit"
          >
            {tMgmt("applyFilters")}
          </button>
        </form>
        <a
          href={exportHref}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          {tMgmt("exportCsv")}
        </a>
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
              <th className="px-3 py-3 font-semibold">{t("columns.time")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.actor")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.action")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.target")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.detail")}</th>
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
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                    {formatHkDateTime(item.createdAt, locale)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    <span className="font-semibold">
                      {t(`actorType.${item.actorType}`)}
                    </span>
                    <span className="text-slate-500"> · {item.actorName}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-800">
                    {item.action}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{item.targetLabel}</td>
                  <td
                    className="max-w-sm truncate px-3 py-3 text-slate-600"
                    title={item.detail}
                  >
                    {item.detail}
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
