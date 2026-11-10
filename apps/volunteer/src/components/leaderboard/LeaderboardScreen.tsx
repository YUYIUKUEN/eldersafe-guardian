"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  getMonthCountdown,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type MonthCountdown,
} from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/browser";
import { MedalIcon } from "./MedalIcon";

type LeaderboardPayload = {
  period: LeaderboardPeriod;
  yearMonth: string;
  countdown: MonthCountdown;
  entries: LeaderboardEntry[];
  self: LeaderboardEntry | null;
  anonymous: boolean;
  updatedAt: string;
};

type LeaderboardScreenProps = {
  userId: string;
  initialPeriod?: LeaderboardPeriod;
};

const REFRESH_MS = 60_000;

function podiumClass(rank: number): string {
  if (rank === 1) return "border-amber-500 bg-amber-50";
  if (rank === 2) return "border-slate-400 bg-slate-100";
  if (rank === 3) return "border-orange-700 bg-orange-50";
  return "border-slate-200 bg-white";
}

function formatCountdown(
  countdown: MonthCountdown,
  t: ReturnType<typeof useTranslations<"VolunteerLeaderboard">>,
): string {
  if (countdown.expired) return t("countdownEnded");
  return t("countdownValue", {
    days: countdown.days,
    hours: String(countdown.hours).padStart(2, "0"),
    minutes: String(countdown.minutes).padStart(2, "0"),
    seconds: String(countdown.seconds).padStart(2, "0"),
  });
}

export function LeaderboardScreen({
  userId,
  initialPeriod = "month",
}: LeaderboardScreenProps) {
  const t = useTranslations("VolunteerLeaderboard");
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const [payload, setPayload] = useState<LeaderboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [privacyPending, startPrivacyTransition] = useTransition();
  const [tick, setTick] = useState(() => getMonthCountdown());

  const load = useCallback(
    async (nextPeriod: LeaderboardPeriod, options?: { log?: boolean }) => {
      const params = new URLSearchParams({ period: nextPeriod });
      if (options?.log) params.set("log", "1");
      const response = await fetch(
        `/api/volunteers/leaderboard?${params.toString()}`,
        { cache: "no-store" },
      );
      const body = (await response.json().catch(() => ({}))) as
        | LeaderboardPayload
        | { error?: string };
      if (!response.ok || !("entries" in body)) {
        throw new Error(
          "error" in body && body.error ? body.error : "load_failed",
        );
      }
      setPayload(body);
      setError(null);
      setTick(getMonthCountdown(new Date(), new Date(body.countdown.endsAt)));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load(period, { log: true });
      } catch {
        if (!cancelled) setError(t("loadFailed"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, period, t]);

  // Local countdown ticker (1s) + full leaderboard refresh (1 min).
  useEffect(() => {
    const secondTimer = window.setInterval(() => {
      setTick((prev) => getMonthCountdown(new Date(), new Date(prev.endsAt)));
    }, 1_000);

    const minuteTimer = window.setInterval(() => {
      void load(period).catch(() => {
        // Keep showing the last good payload; soft-fail refresh.
      });
    }, REFRESH_MS);

    return () => {
      window.clearInterval(secondTimer);
      window.clearInterval(minuteTimer);
    };
  }, [load, period]);

  // Realtime: any points insert / volunteer privacy change → reload.
  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`volunteer-leaderboard:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "points" },
        () => {
          void load(period).catch(() => undefined);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "volunteers" },
        () => {
          void load(period).catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, period, userId]);

  function onToggleAnonymous(next: boolean) {
    startPrivacyTransition(async () => {
      try {
        const response = await fetch("/api/volunteers/leaderboard/privacy", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anonymous: next }),
        });
        if (!response.ok) {
          setError(t("privacyFailed"));
          return;
        }
        await load(period);
      } catch {
        setError(t("privacyFailed"));
      }
    });
  }

  const self = payload?.self ?? null;
  const entries = payload?.entries ?? [];
  const anonymous = payload?.anonymous ?? false;

  const listLabel = useMemo(
    () => (period === "month" ? t("tabMonth") : t("tabAll")),
    [period, t],
  );

  return (
    <div className="flex flex-1 flex-col gap-5 pb-36">
      <section className="rounded-2xl border border-brand/20 bg-gradient-to-br from-sky-50 to-white p-4 sm:p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          {t("countdownLabel", { month: payload?.yearMonth ?? tick.yearMonth })}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
          {formatCountdown(tick, t)}
        </p>
        <p className="mt-2 text-sm text-slate-600">{t("countdownHint")}</p>
      </section>

      <div
        className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1"
        role="tablist"
        aria-label={t("tabsLabel")}
      >
        {([
          ["month", t("tabMonth")],
          ["all", t("tabAll")],
        ] as const).map(([value, label]) => {
          const selected = period === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              className={[
                "min-h-12 rounded-xl px-3 text-base font-bold transition",
                selected
                  ? "bg-brand text-white shadow"
                  : "bg-transparent text-slate-700 hover:bg-white",
              ].join(" ")}
              onClick={() => setPeriod(value)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-brand"
          checked={anonymous}
          disabled={privacyPending || !payload}
          onChange={(event) => onToggleAnonymous(event.target.checked)}
        />
        <span>
          <span className="block text-base font-semibold text-slate-900">
            {t("anonymousLabel")}
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            {t("anonymousHint")}
          </span>
        </span>
      </label>

      {error ? (
        <p role="alert" className="text-base font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {!payload && !error ? (
        <p className="text-base text-slate-600">{t("loading")}</p>
      ) : null}

      {payload && entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-base text-slate-600">
          {t("empty")}
        </p>
      ) : null}

      {entries.length > 0 ? (
        <ol className="flex flex-col gap-3" aria-label={listLabel}>
          {entries.map((entry) => (
            <LeaderboardRow key={entry.volunteerId} entry={entry} t={t} />
          ))}
        </ol>
      ) : null}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-6">
        <div className="pointer-events-auto mx-auto w-full max-w-5xl">
          <SelfRankBar self={self} t={t} />
        </div>
      </div>
    </div>
  );
}

function LeaderboardRow({
  entry,
  t,
}: {
  entry: LeaderboardEntry;
  t: ReturnType<typeof useTranslations<"VolunteerLeaderboard">>;
}) {
  const place =
    entry.rank === 1 || entry.rank === 2 || entry.rank === 3
      ? (entry.rank as 1 | 2 | 3)
      : null;

  return (
    <li
      className={[
        "flex items-center gap-3 rounded-2xl border-2 px-3 py-3 sm:px-4",
        podiumClass(entry.rank),
        entry.isSelf ? "ring-2 ring-brand ring-offset-2" : "",
      ].join(" ")}
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center">
        {place ? (
          <MedalIcon place={place} />
        ) : (
          <span className="text-xl font-bold tabular-nums text-slate-700">
            {entry.rank}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold text-slate-900">
          {entry.displayName}
          {entry.isSelf ? (
            <span className="ml-2 text-sm font-semibold text-brand">
              {t("youBadge")}
            </span>
          ) : null}
          {entry.isAnonymous ? (
            <span className="ml-2 text-xs font-medium text-slate-500">
              {t("anonymousBadge")}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-sm text-slate-600">
          {t("completedCount", { count: entry.completedCount })}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xl font-bold tabular-nums text-brand">
          {entry.points}
        </p>
        <p className="text-xs font-medium text-slate-500">{t("pointsUnit")}</p>
      </div>
    </li>
  );
}

function SelfRankBar({
  self,
  t,
}: {
  self: LeaderboardEntry | null;
  t: ReturnType<typeof useTranslations<"VolunteerLeaderboard">>;
}) {
  return (
    <div className="rounded-2xl border-2 border-brand bg-brand px-4 py-3 text-white shadow-lg shadow-slate-900/15">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-100">
        {t("selfBarLabel")}
      </p>
      {self ? (
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-lg font-bold">
              {t("selfRank", { rank: self.rank })} · {self.displayName}
            </p>
            <p className="text-sm text-sky-100">
              {t("completedCount", { count: self.completedCount })}
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {self.points}
            <span className="ml-1 text-sm font-semibold">{t("pointsUnit")}</span>
          </p>
        </div>
      ) : (
        <p className="mt-1 text-base font-medium">{t("selfMissing")}</p>
      )}
    </div>
  );
}
