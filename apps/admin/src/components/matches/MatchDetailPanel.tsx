"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TrailMap } from "@/components/maps/TrailMap";
import { ReasonDialog } from "@/components/management/ReasonDialog";
import { StatusBadge } from "@/components/management/StatusBadge";
import { formatDuration, formatHkDateTime } from "@/lib/management/format";
import type { MatchDetail } from "@/lib/management/matches";

type MatchDetailPanelProps = {
  id: string;
};

type FilterVolunteer = {
  id: string;
  name: string;
  approvalStatus: string;
};

export function MatchDetailPanel({ id }: MatchDetailPanelProps) {
  const t = useTranslations("AdminMatches");
  const tMgmt = useTranslations("AdminManagement");
  const locale = useLocale();
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [volunteers, setVolunteers] = useState<FilterVolunteer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"cancel" | "reassign" | null>(null);
  const [pending, startTransition] = useTransition();

  const durationLabels = {
    days: t("duration.days"),
    hours: t("duration.hours"),
    minutes: t("duration.minutes"),
    empty: "—",
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, filtersRes] = await Promise.all([
        fetch(`/api/matches/${id}`),
        fetch("/api/matches/filters"),
      ]);
      if (!detailRes.ok) throw new Error("load_failed");
      const json = (await detailRes.json()) as MatchDetail;
      setDetail(json);
      if (filtersRes.ok) {
        const filters = (await filtersRes.json()) as {
          volunteers: FilterVolunteer[];
        };
        setVolunteers(
          (filters.volunteers ?? []).filter(
            (item) => item.approvalStatus === "approved",
          ),
        );
      }
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

  function runAction(input: { reason: string; selectedId?: string }) {
    if (!dialog) return;
    startTransition(async () => {
      try {
        const endpoint =
          dialog === "cancel"
            ? `/api/matches/${id}/cancel`
            : `/api/matches/${id}/reassign`;
        const body =
          dialog === "cancel"
            ? { reason: input.reason }
            : { reason: input.reason, volunteerId: input.selectedId };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          setError(t("actionFailed"));
          setDialog(null);
          return;
        }
        setDialog(null);
        await load();
      } catch {
        setError(t("actionFailed"));
        setDialog(null);
      }
    });
  }

  if (loading) {
    return <p className="text-sm text-slate-600">{tMgmt("loading")}</p>;
  }

  if (!detail) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
        {error ?? t("notFound")}
      </p>
    );
  }

  const canAct =
    detail.status === "pending" || detail.status === "accepted";

  const timeline = [
    {
      key: "created",
      label: t("timeline.created"),
      at: detail.createdAt,
    },
    {
      key: "accepted",
      label: t("timeline.accepted"),
      at: detail.acceptedAt,
    },
    {
      key: "completed",
      label: t("timeline.completed"),
      at: detail.completedAt,
    },
    {
      key: "cancelled",
      label: t("timeline.cancelled"),
      at: detail.cancelledAt,
    },
    {
      key: "confirmed",
      label: t("timeline.elderConfirmed"),
      at: detail.elderConfirmedAt,
    },
  ].filter((item) => item.at);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/matches"
            className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
          >
            {t("backToList")}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-brand">
            {t("detailTitle", { id: detail.shortId })}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={t(`status.${detail.status}`)} />
            <span className="text-sm text-slate-600">
              {detail.elderName}
              {detail.volunteerName ? ` · ${detail.volunteerName}` : ""}
            </span>
          </div>
        </div>
        {canAct ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDialog("reassign")}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("actions.reassign")}
            </button>
            <button
              type="button"
              onClick={() => setDialog("cancel")}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              {t("actions.cancel")}
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-bold text-slate-900">{t("sections.summary")}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("columns.elder")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                <Link
                  href={`/elders/${detail.elderId}`}
                  className="font-semibold text-brand underline-offset-2 hover:underline"
                >
                  {detail.elderName}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("columns.volunteer")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {detail.volunteerId ? (
                  <Link
                    href={`/volunteers/${detail.volunteerId}`}
                    className="font-semibold text-brand underline-offset-2 hover:underline"
                  >
                    {detail.volunteerName}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.elderPhone")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.elderPhone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.elderConfirmed")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {detail.elderConfirmedAt
                  ? t("confirmedYes", {
                      when: formatHkDateTime(detail.elderConfirmedAt, locale),
                    })
                  : t("confirmedNo")}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.elderAddress")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.elderAddress}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("columns.waitDuration")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {formatDuration(
                  detail.createdAt,
                  detail.acceptedAt,
                  durationLabels,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("columns.handleDuration")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {detail.acceptedAt
                  ? formatDuration(
                      detail.acceptedAt,
                      detail.completedAt ?? detail.cancelledAt,
                      durationLabels,
                    )
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-bold text-slate-900">{t("sections.audio")}</h2>
          {detail.audioUrl ? (
            <audio
              className="mt-4 w-full"
              controls
              preload="metadata"
              src={detail.audioUrl}
            >
              {t("audioUnsupported")}
            </audio>
          ) : (
            <p className="mt-4 text-sm text-slate-500">{t("audioMissing")}</p>
          )}
          {detail.transcript ? (
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {detail.transcript}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">{t("sections.trail")}</h2>
        <div className="mt-4">
          <TrailMap
            locations={
              detail.locations.length > 0
                ? detail.locations
                : detail.latitude != null && detail.longitude != null
                  ? [
                      {
                        latitude: detail.latitude,
                        longitude: detail.longitude,
                        recordedAt: detail.createdAt,
                      },
                    ]
                  : []
            }
            emptyLabel={t("mapEmpty")}
            markerColor="#7a4a1e"
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">{t("sections.timeline")}</h2>
        <ol className="mt-4 space-y-3">
          {timeline.map((item) => (
            <li
              key={item.key}
              className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-semibold text-slate-800">
                {item.label}
              </span>
              <span className="text-sm text-slate-600">
                {formatHkDateTime(item.at, locale)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">{t("sections.logs")}</h2>
        {detail.logs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{tMgmt("emptyLogs")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-2 py-2 font-semibold">{tMgmt("columns.action")}</th>
                  <th className="px-2 py-2 font-semibold">{tMgmt("columns.actorType")}</th>
                  <th className="px-2 py-2 font-semibold">{tMgmt("columns.createdAt")}</th>
                  <th className="px-2 py-2 font-semibold">{tMgmt("columns.metadata")}</th>
                </tr>
              </thead>
              <tbody>
                {detail.logs.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 text-slate-700">{item.action}</td>
                    <td className="px-2 py-2 text-slate-700">{item.actorType}</td>
                    <td className="px-2 py-2 text-slate-700">
                      {formatHkDateTime(item.createdAt, locale)}
                    </td>
                    <td
                      className="max-w-xs truncate px-2 py-2 text-slate-700"
                      title={
                        item.metadata ? JSON.stringify(item.metadata) : "—"
                      }
                    >
                      {item.metadata ? JSON.stringify(item.metadata) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ReasonDialog
        open={dialog === "cancel"}
        title={t("confirmCancel.title")}
        body={t("confirmCancel.body", { id: detail.shortId })}
        confirmLabel={t("actions.cancel")}
        reasonLabel={t("reasonLabel")}
        reasonPlaceholder={t("reasonPlaceholder")}
        pending={pending}
        danger
        onCancel={() => setDialog(null)}
        onConfirm={runAction}
      />

      <ReasonDialog
        open={dialog === "reassign"}
        title={t("confirmReassign.title")}
        body={t("confirmReassign.body", { id: detail.shortId })}
        confirmLabel={t("actions.reassign")}
        reasonLabel={t("reasonLabel")}
        reasonPlaceholder={t("reasonPlaceholder")}
        selectLabel={t("selectVolunteer")}
        selectPlaceholder={t("selectVolunteerPlaceholder")}
        selectOptions={volunteers.map((item) => ({
          id: item.id,
          label: item.name,
        }))}
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={runAction}
      />
    </div>
  );
}
