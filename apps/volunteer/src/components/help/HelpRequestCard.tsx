"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  formatDistanceMeters,
  type VolunteerHelpFeedItem,
} from "@eldersafe/shared";
import { reverseGeocodeAreaName } from "@/lib/geo/reverse-geocode";
import { AudioPlayer } from "./AudioPlayer";

type HelpRequestCardProps = {
  item: VolunteerHelpFeedItem;
  distanceMeters: number | null;
  highlight?: boolean;
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
}: HelpRequestCardProps) {
  const t = useTranslations("VolunteerHelp");
  const locale = useLocale();
  const statusLabel = t(`status.${item.status}`);

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
        <p className="mb-2 text-sm font-semibold text-slate-800">
          {t("recording")}
        </p>
        <AudioPlayer helpRequestId={item.id} />
      </div>
    </article>
  );
}
