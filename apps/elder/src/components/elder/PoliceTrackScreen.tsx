"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";
import {
  PoliceTrackMap,
  type TrackLocationPoint,
} from "./PoliceTrackMap";

const POLL_MS = 8_000;

type TrackPayload = {
  emergency: {
    id: string;
    status: "active" | "resolved" | "cancelled";
    startedAt: string;
  };
  elder: {
    name: string;
    age: number;
    address: string;
    healthNotes: string | null;
  };
  locations: TrackLocationPoint[];
};

export function PoliceTrackScreen({ token }: { token: string }) {
  const t = useTranslations("PoliceTrack");
  const [payload, setPayload] = useState<TrackPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function load() {
      try {
        const response = await fetch(`/api/public/track/${token}`);
        const body = (await response.json()) as TrackPayload & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(body.error ?? "not_found");
        }
        if (!cancelled) {
          setPayload(body);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError(t("notFound"));
          setPayload(null);
        }
      }
    }

    void load();
    timer = window.setInterval(() => {
      void load();
    }, POLL_MS);

    return () => {
      cancelled = true;
      if (timer != null) window.clearInterval(timer);
    };
  }, [token, t]);

  return (
    <Page hideLanguageSwitcher>
      <BigText as="h1" size="title" tone="emergency" className="text-center">
        {t("title")}
      </BigText>

      {!payload && !error ? (
        <BigText className="text-center" tone="muted">
          {t("loading")}
        </BigText>
      ) : null}

      {error ? (
        <p role="alert" className="text-[22px] font-bold text-emergency">
          {error}
        </p>
      ) : null}

      {payload ? (
        <section className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-2">
            <BigText size="caption">{t("name")}</BigText>
            <BigText size="title">{payload.elder.name}</BigText>
            <BigText>
              {t("age", { age: payload.elder.age })}
            </BigText>
            <BigText size="caption">{t("address")}</BigText>
            <BigText>{payload.elder.address}</BigText>
            <BigText size="caption">{t("healthNotes")}</BigText>
            <BigText>
              {payload.elder.healthNotes?.trim()
                ? payload.elder.healthNotes
                : t("noHealthNotes")}
            </BigText>
            <BigText tone="muted">
              {t(`status.${payload.emergency.status}`)}
            </BigText>
          </div>

          <PoliceTrackMap
            locations={payload.locations}
            emptyLabel={t("waitingLocation")}
          />
        </section>
      ) : null}
    </Page>
  );
}
