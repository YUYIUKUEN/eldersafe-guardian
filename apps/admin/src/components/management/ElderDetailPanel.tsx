"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ElderDetail } from "@/lib/management/elders";
import { formatHkDateTime } from "@/lib/management/format";
import { ConfirmDialog } from "./ConfirmDialog";
import { StatusBadge } from "./StatusBadge";

type ElderDetailPanelProps = {
  id: string;
};

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

export function ElderDetailPanel({ id }: ElderDetailPanelProps) {
  const t = useTranslations("AdminManagement");
  const locale = useLocale();
  const [detail, setDetail] = useState<ElderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [savePending, startSave] = useTransition();
  const [actionPending, startAction] = useTransition();
  const [pendingAction, setPendingAction] = useState<
    "disable" | "reactivate" | null
  >(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    phone: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    healthNotes: "",
    language: "zh-HK",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/elders/${id}`);
      if (!res.ok) throw new Error("load_failed");
      const json = (await res.json()) as ElderDetail;
      setDetail(json);
      setForm({
        name: json.name,
        age: String(json.age),
        phone: json.phone,
        address: json.address,
        emergencyContactName: json.emergencyContact.name,
        emergencyContactPhone: json.emergencyContact.phone,
        healthNotes: json.healthNotes ?? "",
        language: json.language,
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
        const res = await fetch(`/api/elders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            age: form.age,
            phone: form.phone,
            address: form.address,
            emergencyContactName: form.emergencyContactName,
            emergencyContactPhone: form.emergencyContactPhone,
            healthNotes: form.healthNotes,
            language: form.language,
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
        const res = await fetch(`/api/elders/${id}/status`, {
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
            href="/elders"
            className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
          >
            {t("backToList")}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-brand">
            {detail.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={
                detail.isDisabled ? t("status.disabled") : t("status.active")
              }
              tone={detail.isDisabled ? "danger" : "success"}
            />
            <span className="text-sm text-slate-600">
              {t("lastActiveLabel", {
                date: formatHkDateTime(detail.lastActiveAt, locale),
              })}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setPendingAction(detail.isDisabled ? "reactivate" : "disable")
            }
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {detail.isDisabled
              ? t("actions.reactivate")
              : t("actions.disable")}
          </button>
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
              {t("fields.age")}
              <input
                className={inputClass}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
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
              {t("fields.language")}
              <select
                className={inputClass}
                value={form.language}
                onChange={(e) =>
                  setForm((f) => ({ ...f, language: e.target.value }))
                }
              >
                <option value="zh-HK">zh-HK</option>
                <option value="en">en</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
              {t("fields.address")}
              <input
                className={inputClass}
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              {t("fields.emergencyContactName")}
              <input
                className={inputClass}
                value={form.emergencyContactName}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    emergencyContactName: e.target.value,
                  }))
                }
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              {t("fields.emergencyContactPhone")}
              <input
                className={inputClass}
                value={form.emergencyContactPhone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    emergencyContactPhone: e.target.value,
                  }))
                }
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
              {t("fields.healthNotes")}
              <textarea
                className={inputClass}
                rows={4}
                value={form.healthNotes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, healthNotes: e.target.value }))
                }
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
                {t("fields.age")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.age}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.phone")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.phone}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.address")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.address}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.emergencyContactName")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {detail.emergencyContact.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.emergencyContactPhone")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {detail.emergencyContact.phone || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.healthNotes")}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {detail.healthNotes || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.language")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.language}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.helpRequestCount")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {detail.helpRequestCount}
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
          headers={[
            t("columns.volunteer"),
            t("columns.status"),
            t("columns.createdAt"),
            t("columns.completedAt"),
          ]}
          rows={detail.helpRequests.map((item) => [
            item.volunteerName ?? "—",
            helpStatusLabel(t, item.status),
            formatHkDateTime(item.createdAt, locale),
            formatHkDateTime(item.completedAt, locale),
          ])}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">
          {t("sections.emergencies")}
        </h2>
        <HistoryTable
          empty={t("emptyEmergencies")}
          headers={[
            t("columns.status"),
            t("columns.startedAt"),
            t("columns.endedAt"),
          ]}
          rows={detail.emergencies.map((item) => [
            t(`emergencyStatus.${item.status}`),
            formatHkDateTime(item.startedAt, locale),
            formatHkDateTime(item.endedAt, locale),
          ])}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">{t("sections.logs")}</h2>
        <HistoryTable
          empty={t("emptyLogs")}
          headers={[
            t("columns.action"),
            t("columns.actorType"),
            t("columns.createdAt"),
            t("columns.metadata"),
          ]}
          rows={detail.logs.map((item) => [
            item.action,
            item.actorType,
            formatHkDateTime(item.createdAt, locale),
            item.metadata ? JSON.stringify(item.metadata) : "—",
          ])}
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
        danger={pendingAction === "disable"}
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
            <tr key={`${row.join("-")}-${index}`} className="border-t border-slate-100">
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
