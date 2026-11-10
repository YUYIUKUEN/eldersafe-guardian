"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import {
  buildMapNavigationUrl,
  isAwaitingElderConfirm,
  volunteerDisplayStatus,
  type VolunteerHelpFeedItem,
} from "@eldersafe/shared";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";
import { geocodeAddress } from "@/lib/geo/geocode-address";
import { useVolunteerLocation } from "@/lib/geo/use-volunteer-location";
import { AudioPlayer } from "./AudioPlayer";
import type { MapPoint } from "./HelpRequestMap";

const HelpRequestMap = dynamic(
  () =>
    import("./HelpRequestMap").then((mod) => ({ default: mod.HelpRequestMap })),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-72 w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100 sm:h-96"
        aria-hidden
      />
    ),
  },
);

type HelpRequestDetailProps = {
  helpRequestId: string;
  volunteerId: string;
  initialItem: VolunteerHelpFeedItem;
};

export function HelpRequestDetail({
  helpRequestId,
  volunteerId,
  initialItem,
}: HelpRequestDetailProps) {
  const t = useTranslations("VolunteerHelpDetail");
  const tHelp = useTranslations("VolunteerHelp");
  const locale = useLocale();
  const router = useRouter();
  const location = useVolunteerLocation();

  const [item, setItem] = useState(initialItem);
  const [addressPoint, setAddressPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [showRelease, setShowRelease] = useState(false);
  const [pending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    const response = await fetch(
      `/api/volunteers/help-requests/${helpRequestId}`,
      { cache: "no-store" },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      item?: VolunteerHelpFeedItem;
    };
    if (response.ok && payload.item) {
      setItem(payload.item);
    }
  }, [helpRequestId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`help-detail:${helpRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "help_requests",
          filter: `id=eq.${helpRequestId}`,
        },
        () => {
          void reload();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "locations",
          filter: `help_request_id=eq.${helpRequestId}`,
        },
        () => {
          void reload();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [helpRequestId, reload]);

  useEffect(() => {
    const address = item.elderAddress;
    if (!address) return;
    const controller = new AbortController();
    void geocodeAddress(address, locale).then((point) => {
      if (!controller.signal.aborted) setAddressPoint(point);
    });
    return () => controller.abort();
  }, [item.elderAddress, locale]);

  const resolvedAddressPoint = item.elderAddress ? addressPoint : null;

  const mapPoints = useMemo(() => {
    const points: MapPoint[] = [];
    if (item.liveLatitude != null && item.liveLongitude != null) {
      points.push({
        latitude: item.liveLatitude,
        longitude: item.liveLongitude,
        kind: "live",
      });
    }
    if (resolvedAddressPoint) {
      points.push({ ...resolvedAddressPoint, kind: "address" });
    }
    if (location.coords) {
      points.push({ ...location.coords, kind: "volunteer" });
    }
    return points;
  }, [
    item.liveLatitude,
    item.liveLongitude,
    resolvedAddressPoint,
    location.coords,
  ]);

  const navTarget =
    item.liveLatitude != null && item.liveLongitude != null
      ? {
          latitude: item.liveLatitude,
          longitude: item.liveLongitude,
          label: item.elderName,
        }
      : resolvedAddressPoint
        ? {
            ...resolvedAddressPoint,
            label: item.elderAddress ?? item.elderName,
          }
        : null;

  const displayStatus = volunteerDisplayStatus(item);
  const isMineActive =
    item.volunteerId === volunteerId &&
    item.status === "accepted" &&
    !item.completedAt;
  const isAwaiting = isAwaitingElderConfirm(item);
  const isPending = item.status === "pending";
  const isCompleted = item.status === "completed";

  function onAccept() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/volunteers/help-requests/${helpRequestId}/accept`,
          { method: "POST" },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (response.status === 409 || payload.error === "already_taken") {
          setError(t("alreadyTaken"));
          await reload();
          return;
        }
        if (!response.ok) {
          setError(t("acceptFailed"));
          return;
        }
        await reload();
        router.refresh();
      } catch {
        setError(t("acceptFailed"));
      }
    });
  }

  function onRelease() {
    setError(null);
    const reason = releaseReason.trim();
    if (reason.length < 2) {
      setError(t("reasonRequired"));
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/volunteers/help-requests/${helpRequestId}/release`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!response.ok) {
          setError(
            payload.error === "reason_required"
              ? t("reasonRequired")
              : t("releaseFailed"),
          );
          return;
        }
        router.replace("/");
        router.refresh();
      } catch {
        setError(t("releaseFailed"));
      }
    });
  }

  function onComplete() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/volunteers/help-requests/${helpRequestId}/complete`,
          { method: "POST" },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!response.ok) {
          setError(
            payload.error === "not_completable"
              ? t("completeNotAllowed")
              : t("completeFailed"),
          );
          await reload();
          return;
        }
        await reload();
        router.refresh();
      } catch {
        setError(t("completeFailed"));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-brand">
          {tHelp(`status.${displayStatus}`)}
        </p>
        {isAwaiting ? (
          <p className="text-sm text-slate-600">{t("awaitingElderHint")}</p>
        ) : null}
        {isCompleted ? (
          <p className="text-sm text-slate-600">{t("completedHint")}</p>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {tHelp("elderLine", { name: item.elderName, age: item.elderAge })}
        </h1>
        {item.elderAddress ? (
          <p className="text-base text-slate-700">
            {tHelp("address")} {item.elderAddress}
          </p>
        ) : null}
        {item.elderPhone ? (
          <p className="text-base text-slate-700">
            {tHelp("phone")} {item.elderPhone}
          </p>
        ) : null}
      </div>

      <HelpRequestMap points={mapPoints} />

      <div className="flex flex-wrap gap-3 text-sm text-slate-700">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#c62828]" />
          {t("legendLive")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#1d4f91]" />
          {t("legendAddress")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#2e7d32]" />
          {t("legendVolunteer")}
        </span>
      </div>

      {navTarget ? (
        <a
          href={buildMapNavigationUrl(navTarget)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white"
        >
          {t("openMaps")}
        </a>
      ) : (
        <p className="text-sm text-slate-600">{t("navUnavailable")}</p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-slate-800">
          {tHelp("recording")}
        </p>
        <AudioPlayer
          key={item.id}
          helpRequestId={item.id}
          elderId={item.elderId}
          transcript={item.transcript}
        />
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {isPending ? (
          <button
            type="button"
            disabled={pending}
            onClick={onAccept}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {pending ? t("accepting") : t("accept")}
          </button>
        ) : null}

        {isMineActive ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={onComplete}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
            >
              {pending ? t("completing") : t("complete")}
            </button>
            {showRelease ? (
              <div className="w-full space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <label className="block text-sm font-semibold text-slate-800">
                  {t("releaseReason")}
                  <textarea
                    className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
                    value={releaseReason}
                    onChange={(event) => setReleaseReason(event.target.value)}
                    disabled={pending}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onRelease}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-700 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
                  >
                    {pending ? t("releasing") : t("confirmRelease")}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setShowRelease(false)}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-200 px-4 py-3 text-base font-semibold text-slate-800"
                  >
                    {t("cancelRelease")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowRelease(true)}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-700 px-4 py-3 text-base font-semibold text-white"
              >
                {t("release")}
              </button>
            )}
          </>
        ) : null}

        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-800 px-4 py-3 text-base font-semibold text-white"
        >
          {t("backToList")}
        </Link>
      </div>
    </div>
  );
}
