"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ElderListItem } from "@/lib/management/elders";
import { formatHkDateTime } from "@/lib/management/format";
import { ConfirmDialog } from "./ConfirmDialog";
import { PaginationBar } from "./PaginationBar";
import { StatusBadge } from "./StatusBadge";

type ListResponse = {
  items: ElderListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type PendingAction = {
  id: string;
  name: string;
  action: "disable" | "reactivate";
};

export function EldersManager() {
  const t = useTranslations("AdminManagement");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "disabled">("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionPending, startAction] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        status,
      });
      if (q) params.set("q", q);
      const res = await fetch(`/api/elders?${params.toString()}`);
      if (!res.ok) throw new Error("load_failed");
      const json = (await res.json()) as ListResponse;
      setData(json);
    } catch {
      setError(t("loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, q, status, t]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  function runAction() {
    if (!pendingAction) return;
    const current = pendingAction;
    startAction(async () => {
      try {
        const res = await fetch(`/api/elders/${current.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: current.action }),
        });
        if (!res.ok) {
          setError(t("actionFailed"));
          setPendingAction(null);
          return;
        }
        setPendingAction(null);
        await load();
      } catch {
        setError(t("actionFailed"));
        setPendingAction(null);
      }
    });
  }

  const exportHref = `/api/elders/export?${new URLSearchParams({
    status,
    ...(q ? { q } : {}),
  }).toString()}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form
          className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQ(draftQ.trim());
          }}
        >
          <label className="block flex-1 text-sm font-semibold text-slate-800">
            {t("search")}
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder={t("elderSearchPlaceholder")}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-800 sm:w-48">
            {t("statusFilter")}
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
              <option value="disabled">{t("status.disabled")}</option>
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {t("applyFilters")}
          </button>
        </form>
        <a
          href={exportHref}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          {t("exportCsv")}
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
              <th className="px-3 py-3 font-semibold">{t("columns.name")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.age")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.phone")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.address")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.lastActiveAt")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.helpRequestCount")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.status")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-slate-500">
                  {t("loading")}
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-slate-500">
                  {t("empty")}
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
                      href={`/elders/${item.id}`}
                      className="font-semibold text-brand underline-offset-2 hover:underline"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{item.age}</td>
                  <td className="px-3 py-3 text-slate-700">{item.phone}</td>
                  <td className="max-w-xs truncate px-3 py-3 text-slate-700">
                    {item.address}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatHkDateTime(item.lastActiveAt, locale)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {item.helpRequestCount}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      label={
                        item.isDisabled
                          ? t("status.disabled")
                          : t("status.active")
                      }
                      tone={item.isDisabled ? "danger" : "success"}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAction({
                          id: item.id,
                          name: item.name,
                          action: item.isDisabled ? "reactivate" : "disable",
                        })
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      {item.isDisabled
                        ? t("actions.reactivate")
                        : t("actions.disable")}
                    </button>
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

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction
            ? t(`confirmDialog.${pendingAction.action}.title`)
            : ""
        }
        body={
          pendingAction
            ? t(`confirmDialog.${pendingAction.action}.body`, {
                name: pendingAction.name,
              })
            : ""
        }
        confirmLabel={
          pendingAction ? t(`actions.${pendingAction.action}`) : t("confirmAction")
        }
        danger={pendingAction?.action === "disable"}
        pending={actionPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={runAction}
      />
    </div>
  );
}
