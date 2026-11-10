"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { VolunteerApprovalStatus } from "@eldersafe/shared";
import { Link } from "@/i18n/navigation";
import {
  formatHkDate,
  formatHkDateTime,
  formatServiceAreas,
} from "@/lib/management/format";
import type { VolunteerDetail } from "@/lib/management/volunteers";
import { ConfirmDialog } from "./ConfirmDialog";
import { StatusBadge } from "./StatusBadge";

type VolunteerDetailPanelProps = {
  id: string;
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

function actionsFor(status: VolunteerApprovalStatus) {
  switch (status) {
    case "pending":
      return ["approve", "reject"] as const;
    case "approved":
      return ["disable"] as const;
    case "disabled":
    case "rejected":
      return ["reactivate"] as const;
    default:
      return [] as const;
  }
}

function helpStatusLabel(
  t: ReturnType<typeof useTranslations<"AdminManagement">>,
  status: string,
) {
  if (
    status === "pending" ||
    status === "accepted" ||
    status === "completed" ||
    status === "cancelled"
  ) {
    return t(`helpStatus.${status}`);
  }
  return status;
}

export function VolunteerDetailPanel({ id }: VolunteerDetailPanelProps) {
  const t = useTranslations("AdminManagement");
  const locale = useLocale();
  const [detail, setDetail] = useState<VolunteerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [savePending, startSave] = useTransition();
  const [actionPending, startAction] = useTransition();
  const [pendingAction, setPendingAction] = useState<
    "approve" | "reject" | "disable" | "reactivate" | null
  >(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    age: "",
    serviceAreas: "",
    bio: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/volunteers/${id}`);
      if (!res.ok) throw new Error("load_failed");
      const json = (await res.json()) as VolunteerDetail;
      setDetail(json);
      setForm({
        name: json.name,
        phone: json.phone,
        age: String(json.age),
        serviceAreas: json.serviceAreas.join(", "),
        bio: json.bio,
      });
    } catch {
      setError(t("loadFailed"));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  function saveProfile() {
    setFormError(null);
    startSave(async () => {
      try {
        const res = await fetch(`/api/volunteers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            age: form.age,
            serviceAreas: form.serviceAreas,
            bio: form.bio,
          }),
        });
        if (!res.ok) {
          setFormError(t("saveFailed"));
          return;
        }
        setEditing(false);
        await load();
      } catch {
        setFormError(t("saveFailed"));
      }
    });
  }

  function runStatusAction() {
    if (!pendingAction) return;
    const action = pendingAction;
    startAction(async () => {
      try {
        const res = await fetch(`/api/volunteers/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
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

  if (loading) {
    return <p className="text-sm text-slate-600">{t("loading")}</p>;
  }

  if (!detail) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
        {error ?? t("notFound")}
      </p>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/volunteers"
            className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
          >
            {t("backToList")}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-brand">
            {detail.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={t(`status.${detail.approvalStatus}`)}
              tone={statusTone(detail.approvalStatus)}
            />
            <span className="text-sm text-slate-600">
              {t("registeredAtLabel", {
                date: formatHkDate(detail.createdAt, locale),
              })}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {actionsFor(detail.approvalStatus).map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => setPendingAction(action)}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t(`actions.${action}`)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setEditing((value) => !value);
              setFormError(null);
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {editing ? t("cancelEdit") : t("editProfile")}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">{t("sections.profile")}</h2>
        {editing ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-800">
              {t("fields.name")}
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              {t("fields.phone")}
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              {t("fields.age")}
              <input
                className={inputClass}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
              {t("fields.serviceAreas")}
              <input
                className={inputClass}
                value={form.serviceAreas}
                onChange={(e) =>
                  setForm((f) => ({ ...f, serviceAreas: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
              {t("fields.bio")}
              <textarea
                className={inputClass}
                rows={4}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </label>
            {formError ? (
              <p className="sm:col-span-2 text-sm font-medium text-red-700" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <button
                type="button"
                disabled={savePending}
                onClick={saveProfile}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {savePending ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        ) : (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.email")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.phone")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.age")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.age}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.completedServices")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {detail.completedServices}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.serviceAreas")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {formatServiceAreas(detail.serviceAreas)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.bio")}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {detail.bio || "—"}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">
          {t("sections.helpHistory")}
        </h2>
        <HistoryTable
          empty={t("emptyHistory")}
          rows={detail.helpRequests.map((item) => [
            item.elderName ?? "—",
            helpStatusLabel(t, item.status),
            formatHkDateTime(item.createdAt, locale),
            formatHkDateTime(item.completedAt, locale),
          ])}
          headers={[
            t("columns.elder"),
            t("columns.status"),
            t("columns.createdAt"),
            t("columns.completedAt"),
          ]}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">
          {t("sections.points", { total: detail.pointsTotal })}
        </h2>
        <HistoryTable
          empty={t("emptyPoints")}
          rows={detail.points.map((item) => [
            String(item.points),
            item.helpRequestId.slice(0, 8),
            formatHkDateTime(item.createdAt, locale),
          ])}
          headers={[
            t("columns.points"),
            t("columns.helpRequest"),
            t("columns.createdAt"),
          ]}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">
          {t("sections.certificates")}
        </h2>
        <HistoryTable
          empty={t("emptyCertificates")}
          rows={detail.certificates.map((item) => [
            item.yearMonth,
            String(item.rank),
            formatHkDateTime(item.generatedAt, locale),
            item.filePath,
          ])}
          headers={[
            t("columns.yearMonth"),
            t("columns.rank"),
            t("columns.generatedAt"),
            t("columns.filePath"),
          ]}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">{t("sections.logs")}</h2>
        <HistoryTable
          empty={t("emptyLogs")}
          rows={detail.logs.map((item) => [
            item.action,
            item.actorType,
            formatHkDateTime(item.createdAt, locale),
            item.metadata ? JSON.stringify(item.metadata) : "—",
          ])}
          headers={[
            t("columns.action"),
            t("columns.actorType"),
            t("columns.createdAt"),
            t("columns.metadata"),
          ]}
        />
      </section>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction ? t(`confirmDialog.${pendingAction}.title`) : ""}
        body={
          pendingAction
            ? t(`confirmDialog.${pendingAction}.body`, { name: detail.name })
            : ""
        }
        confirmLabel={
          pendingAction ? t(`actions.${pendingAction}`) : t("confirmAction")
        }
        danger={pendingAction === "reject" || pendingAction === "disable"}
        pending={actionPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={runStatusAction}
      />
    </div>
  );
}

function HistoryTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">{empty}</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-600">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-2 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className="border-t border-slate-100">
              {row.map((cell, cellIndex) => (
                <td
                  key={`${index}-${cellIndex}`}
                  className="max-w-xs truncate px-2 py-2 text-slate-700"
                  title={cell}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
