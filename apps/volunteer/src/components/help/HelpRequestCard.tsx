"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  formatDistanceMeters,
  volunteerDisplayStatus,
  type VolunteerHelpFeedItem,
} from "@eldersafe/shared";
import { Link, useRouter } from "@/i18n/navigation";
import { reverseGeocodeAreaName } from "@/lib/geo/reverse-geocode";

type HelpRequestCardProps = {
  item: VolunteerHelpFeedItem;
  distanceMeters: number | null;
  highlight?: boolean;
  volunteerId: string;
  onChanged?: () => void;
};

function formatCreatedAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-HK" : "zh-HK", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function LiveAreaLabel({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const t = useTranslations("VolunteerHelp");
  const locale = useLocale();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    const controller = new AbortController();

    void reverseGeocodeAreaName(latitude, longitude, locale).then((value) => {
      if (!controller.signal.aborted) setLabel(value);
    });

    return () => controller.abort();
  }, [latitude, longitude, locale]);

  if (latitude == null || longitude == null) {
    return <>{t("locationUnknown")}</>;
  }
  return <>{label ?? t("locationLoading")}</>;
}

export function HelpRequestCard({
  item,
  distanceMeters,
  highlight = false,
  volunteerId,
  onChanged,
}: HelpRequestCardProps) {
  const t = useTranslations("VolunteerHelp");
  const tDetail = useTranslations("VolunteerHelpDetail");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const displayStatus = volunteerDisplayStatus(item);
  const statusLabel = t(`status.${displayStatus}`);
  const detailHref = `/help-requests/${item.id}`;
  const canAccept = item.status === "pending";
  const isMine =
    item.volunteerId === volunteerId &&
    (item.status === "accepted" || item.status === "completed");

  function onAccept() {
    setActionError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/volunteers/help-requests/${item.id}/accept`,
          { method: "POST" },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (response.status === 409 || payload.error === "already_taken") {
          setActionError(tDetail("alreadyTaken"));
          onChanged?.();
          return;
        }
        if (!response.ok) {
          setActionError(tDetail("acceptFailed"));
          return;
        }
        onChanged?.();
        router.push(detailHref);
        router.refresh();
      } catch {
        setActionError(tDetail("acceptFailed"));
      }
    });
  }

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm transition sm:p-5 ${
        highlight
          ? "border-brand ring-2 ring-brand/30"
          : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {t("elderLine", { name: item.elderName, age: item.elderAge })}
          </h2>
          <p className="mt-1 text-sm font-medium text-brand">{statusLabel}</p>
        </div>
        <p className="text-sm text-slate-600">
          {t("createdAt", { when: formatCreatedAt(item.createdAt, locale) })}
        </p>
      </div>

      <dl className="mt-4 space-y-2 text-base text-slate-700">
        <div>
          <dt className="inline font-semibold text-slate-800">
            {t("liveLocation")}
          </dt>
          <dd className="inline">
            {" "}
            <LiveAreaLabel
              latitude={item.liveLatitude}
              longitude={item.liveLongitude}
            />
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-slate-800">{t("address")}</dt>
          <dd className="inline">
            {" "}
            {item.elderAddress ?? t("addressAfterAccept")}
          </dd>
        </div>
        {item.elderPhone ? (
          <div>
            <dt className="inline font-semibold text-slate-800">{t("phone")}</dt>
            <dd className="inline"> {item.elderPhone}</dd>
          </div>
        ) : null}
        {distanceMeters != null ? (
          <div>
            <dt className="inline font-semibold text-slate-800">
              {t("distance")}
            </dt>
            <dd className="inline">
              {" "}
              {formatDistanceMeters(distanceMeters, locale)}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-600">
          {t("recording")} — {tDetail("openDetail")}
        </p>
      </div>

      {actionError ? (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {canAccept ? (
          <button
            type="button"
            disabled={pending}
            onClick={onAccept}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? tDetail("accepting") : tDetail("accept")}
          </button>
        ) : null}
        <Link
          href={detailHref}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          {isMine || item.status !== "pending"
            ? tDetail("openDetail")
            : tDetail("viewMap")}
        </Link>
      </div>
    </article>
  );
}
