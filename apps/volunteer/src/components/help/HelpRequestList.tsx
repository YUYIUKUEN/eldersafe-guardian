"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  filterVolunteerHelpFeed,
  haversineDistanceMeters,
  type VolunteerHelpFeedFilter,
  type VolunteerHelpFeedItem,
  type VolunteerHelpFeedSort,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/browser";
import { useVolunteerLocation } from "@/lib/geo/use-volunteer-location";
import { HelpRequestCard } from "./HelpRequestCard";

type HelpRequestListProps = {
  volunteerId: string;
};

function playSoftChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.04;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    oscillator.stop(ctx.currentTime + 0.4);
    window.setTimeout(() => {
      void ctx.close();
    }, 500);
  } catch {
    // Optional chime must never break the list.
  }
}

export function HelpRequestList({ volunteerId }: HelpRequestListProps) {
  const t = useTranslations("VolunteerHelp");
  const location = useVolunteerLocation();
  const [items, setItems] = useState<VolunteerHelpFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<VolunteerHelpFeedFilter>("pending");
  const [sort, setSort] = useState<VolunteerHelpFeedSort>("newest");
  const [banner, setBanner] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);

  const loadFeed = useCallback(async () => {
    try {
      const response = await fetch("/api/volunteers/help-requests", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        items?: VolunteerHelpFeedItem[];
        error?: string;
      };
      if (!response.ok) {
        setError(t("loadFailed"));
        return;
      }
      const next = payload.items ?? [];
      setItems(next);
      setError(null);
      knownIdsRef.current = new Set(next.map((item) => item.id));
      readyRef.current = true;
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFeed();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFeed]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`volunteer-help-feed:${volunteerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "help_requests" },
        (payload) => {
          const row = payload.new as { id?: string; status?: string } | null;
          const id = row?.id;
          const wasKnown = id ? knownIdsRef.current.has(id) : true;
          const shouldAnnounce =
            payload.eventType === "INSERT" &&
            Boolean(id) &&
            row?.status === "pending" &&
            readyRef.current &&
            !wasKnown;

          void loadFeed().then(() => {
            if (!shouldAnnounce || !id) return;
            setBanner(t("newRequestBanner"));
            setHighlightId(id);
            setFilter("pending");
            if (soundEnabled) playSoftChime();
            window.setTimeout(() => setHighlightId(null), 8000);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        () => {
          void loadFeed();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [volunteerId, loadFeed, soundEnabled, t]);

  const visible = useMemo(() => {
    const filtered = filterVolunteerHelpFeed(items, filter, volunteerId);
    if (sort !== "distance" || !location.coords) {
      return [...filtered].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return [...filtered].sort((a, b) => {
      const aLat = a.liveLatitude;
      const aLng = a.liveLongitude;
      const bLat = b.liveLatitude;
      const bLng = b.liveLongitude;
      const aDist =
        aLat != null && aLng != null
          ? haversineDistanceMeters(location.coords!, {
              latitude: aLat,
              longitude: aLng,
            })
          : Number.POSITIVE_INFINITY;
      const bDist =
        bLat != null && bLng != null
          ? haversineDistanceMeters(location.coords!, {
              latitude: bLat,
              longitude: bLng,
            })
          : Number.POSITIVE_INFINITY;
      return aDist - bDist;
    });
  }, [items, filter, volunteerId, sort, location.coords]);

  const filterButton = (
    value: VolunteerHelpFeedFilter,
    label: string,
  ) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
        filter === value
          ? "bg-brand text-white"
          : "bg-white text-brand ring-1 ring-brand/25 hover:bg-sky-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterButton("pending", t("filterPending"))}
          {filterButton("mine", t("filterMine"))}
          {filterButton("completed", t("filterCompleted"))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold text-slate-700">
            {t("sortLabel")}
            <select
              className="ml-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as VolunteerHelpFeedSort)
              }
            >
              <option value="newest">{t("sortNewest")}</option>
              <option value="distance">{t("sortDistance")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-400"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
            {t("soundToggle")}
          </label>
        </div>
      </div>

      {location.status === "denied" || location.status === "unavailable" ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {t("locationPermissionHint")}
        </p>
      ) : null}

      {sort === "distance" && !location.coords ? (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {t("distanceSortNeedsLocation")}
        </p>
      ) : null}

      {banner ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand px-4 py-3 text-white"
          role="status"
        >
          <p className="font-semibold">{banner}</p>
          <button
            type="button"
            className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"
            onClick={() => setBanner(null)}
          >
            {t("dismissBanner")}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-base text-slate-600">{t("loading")}</p>
      ) : error ? (
        <p className="text-base font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-10 text-center text-base text-slate-600">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((item) => {
            const lat = item.liveLatitude;
            const lng = item.liveLongitude;
            const distanceMeters =
              location.coords && lat != null && lng != null
                ? haversineDistanceMeters(location.coords, {
                    latitude: lat,
                    longitude: lng,
                  })
                : null;
            return (
              <li key={item.id}>
                <HelpRequestCard
                  item={item}
                  distanceMeters={distanceMeters}
                  highlight={highlightId === item.id}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
