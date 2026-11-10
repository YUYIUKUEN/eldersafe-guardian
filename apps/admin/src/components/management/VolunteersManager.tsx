"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { VolunteerApprovalStatus } from "@eldersafe/shared";
import { Link } from "@/i18n/navigation";
import {
  formatHkDate,
  formatServiceAreas,
} from "@/lib/management/format";
import type { VolunteerListItem } from "@/lib/management/volunteers";
import { ConfirmDialog } from "./ConfirmDialog";
import { PaginationBar } from "./PaginationBar";
import { StatusBadge } from "./StatusBadge";

type ListResponse = {
  items: VolunteerListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type PendingAction = {
  id: string;
  name: string;
  action: "approve" | "reject" | "disable" | "reactivate";
};

function statusTone(status: VolunteerApprovalStatus) {
  switch (status) {
    case "approved":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "rejected":
    case "disabled":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function actionsFor(status: VolunteerApprovalStatus): PendingAction["action"][] {
  switch (status) {
    case "pending":
      return ["approve", "reject"];
    case "approved":
      return ["disable"];
    case "disabled":
    case "rejected":
      return ["reactivate"];
    default:
      return [];
  }
}

export function VolunteersManager() {
  const t = useTranslations("AdminManagement");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [status, setStatus] = useState<"all" | VolunteerApprovalStatus>("all");
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
      const res = await fetch(`/api/volunteers?${params.toString()}`);
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
        const res = await fetch(`/api/volunteers/${current.id}/status`, {
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

  const exportHref = `/api/volunteers/export?${new URLSearchParams({
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
              placeholder={t("volunteerSearchPlaceholder")}
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
              <option value="pending">{t("status.pending")}</option>
              <option value="approved">{t("status.approved")}</option>
              <option value="rejected">{t("status.rejected")}</option>
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
              <th className="px-3 py-3 font-semibold">{t("columns.phone")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.email")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.serviceAreas")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.status")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.registeredAt")}</th>
              <th className="px-3 py-3 font-semibold">{t("columns.completedServices")}</th>
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
                      href={`/volunteers/${item.id}`}
                      className="font-semibold text-brand underline-offset-2 hover:underline"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{item.phone}</td>
                  <td className="px-3 py-3 text-slate-700">
                    {item.email || "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatServiceAreas(item.serviceAreas)}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      label={t(`status.${item.approvalStatus}`)}
                      tone={statusTone(item.approvalStatus)}
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatHkDate(item.createdAt, locale)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {item.completedServices}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {actionsFor(item.approvalStatus).map((action) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() =>
                            setPendingAction({
                              id: item.id,
                              name: item.name,
                              action,
                            })
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          {t(`actions.${action}`)}
                        </button>
                      ))}
                    </div>
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
        danger={
          pendingAction?.action === "reject" ||
          pendingAction?.action === "disable"
        }
        pending={actionPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={runAction}
      />
    </div>
  );
}
