"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getEmergencyByToken,
  type StoredEmergencyEvent,
} from "@eldersafe/shared";

type PoliceLocationViewProps = {
  token: string;
};

export function PoliceLocationView({ token }: PoliceLocationViewProps) {
  const t = useTranslations("PoliceView");
  const [event, setEvent] = useState<StoredEmergencyEvent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function load() {
      setEvent(getEmergencyByToken(token));
      setReady(true);
    }
    load();
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [token]);

  if (!ready) {
    return <p className="py-10 text-[20px]">…</p>;
  }

  if (!event) {
    return (
      <section className="py-8">
        <h1 className="text-[28px] font-bold">{t("title")}</h1>
        <p className="mt-4 text-[20px]">{t("notFound")}</p>
      </section>
    );
  }

  const mapUrl =
    event.latitude != null && event.longitude != null
      ? `https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=17/${event.latitude}/${event.longitude}`
      : null;

  return (
    <section className="flex flex-1 flex-col gap-4 py-8">
      <h1 className="text-[28px] font-bold">{t("title")}</h1>
      <p className="text-[20px]">
        {t("elder")}: <strong>{event.elderName}</strong>
      </p>
      {event.locationUpdatedAt ? (
        <p className="text-[20px]">
          {t("updatedAt")}: {new Date(event.locationUpdatedAt).toLocaleString()}
        </p>
      ) : (
        <p className="text-[20px]">{t("noLocation")}</p>
      )}
      {event.latitude != null && event.longitude != null ? (
        <p className="text-[20px]">
          {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
        </p>
      ) : null}
      {mapUrl ? (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-14 items-center justify-center rounded-xl bg-brand px-4 text-[20px] font-bold text-white"
        >
          {t("openMap")}
        </a>
      ) : null}
    </section>
  );
}
