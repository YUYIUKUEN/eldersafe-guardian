"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TrailMap, type TrailPoint } from "@/components/maps/TrailMap";
import { ReasonDialog } from "@/components/management/ReasonDialog";
import { StatusBadge } from "@/components/management/StatusBadge";
import { createClient } from "@/lib/supabase/browser";
import { formatHkDateTime } from "@/lib/management/format";
import type { EmergencyDetail } from "@/lib/management/emergencies";

type EmergencyDetailPanelProps = {
  id: string;
};

export function EmergencyDetailPanel({ id }: EmergencyDetailPanelProps) {
  const t = useTranslations("AdminEmergencies");
  const tMgmt = useTranslations("AdminManagement");
  const locale = useLocale();
  const [detail, setDetail] = useState<EmergencyDetail | null>(null);
  const [locations, setLocations] = useState<TrailPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/emergencies/${id}`);
      if (!res.ok) throw new Error("load_failed");
      const json = (await res.json()) as EmergencyDetail;
      setDetail(json);
      setLocations(json.locations);
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

  useEffect(() => {
    if (!detail || detail.status !== "active") return;

    const supabase = createClient();
    const channel = supabase
      .channel(`admin-emergency-locations:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "locations",
          filter: `emergency_id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: number;
            latitude?: number;
            longitude?: number;
            accuracy_m?: number | null;
            recorded_at?: string;
          };
          if (
            typeof row.latitude !== "number" ||
            typeof row.longitude !== "number"
          ) {
            return;
          }
          const nextPoint: TrailPoint = {
            latitude: row.latitude,
            longitude: row.longitude,
            accuracyM: row.accuracy_m ?? null,
            recordedAt: row.recorded_at,
          };
          setLocations((prev) => [...prev, nextPoint]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [detail, id]);

  function resolveEmergency(input: { reason: string }) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/emergencies/${id}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: input.reason }),
        });
        if (!res.ok) {
          setError(t("actionFailed"));
          setResolveOpen(false);
          return;
        }
        setResolveOpen(false);
        await load();
      } catch {
        setError(t("actionFailed"));
        setResolveOpen(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/emergencies"
            className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
          >
            {t("backToList")}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-brand">
            {t("detailTitle", { id: detail.shortId })}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={t(`status.${detail.status}`)}
              tone={
                detail.status === "active"
                  ? "danger"
                  : detail.status === "resolved"
                    ? "success"
                    : "neutral"
              }
            />
            {detail.status === "active" ? (
              <span className="text-sm font-semibold text-red-700">
                {t("liveUpdating")}
              </span>
            ) : null}
          </div>
        </div>
        {detail.status === "active" ? (
          <button
            type="button"
            onClick={() => setResolveOpen(true)}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {t("actions.resolve")}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-bold text-slate-900">{t("sections.elder")}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.name")}
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
                {t("fields.age")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.elderAge || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.phone")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.elderPhone}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("fields.address")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{detail.elderAddress}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("columns.startedAt")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {formatHkDateTime(detail.startedAt, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("columns.endedAt")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {formatHkDateTime(detail.endedAt, locale)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-bold text-slate-900">{t("sections.policeLink")}</h2>
          <p className="mt-3 text-sm text-slate-700">{t("policeLinkHint")}</p>
          <a
            href={detail.policeTrackUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex break-all text-sm font-semibold text-brand underline-offset-2 hover:underline"
          >
            {detail.policeTrackUrl}
          </a>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">{t("sections.map")}</h2>
        <div className="mt-4">
          <TrailMap locations={locations} emptyLabel={t("mapEmpty")} />
        </div>
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
        open={resolveOpen}
        title={t("confirmResolve.title")}
        body={t("confirmResolve.body", { id: detail.shortId })}
        confirmLabel={t("actions.resolve")}
        reasonLabel={t("noteLabel")}
        reasonPlaceholder={t("notePlaceholder")}
        pending={pending}
        onCancel={() => setResolveOpen(false)}
        onConfirm={resolveEmergency}
      />
    </div>
  );
}
