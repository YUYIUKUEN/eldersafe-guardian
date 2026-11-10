"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  applyPodiumDecision,
  hongKongYearMonth,
  type PodiumResolution,
} from "@eldersafe/shared";
import { Link } from "@/i18n/navigation";
import type {
  CertificateRow,
  MonthLeaderboardPayload,
  SettlementRecord,
} from "@/lib/management/leaderboard";
import type { RankedVolunteer } from "@eldersafe/shared";

function monthOptions(count = 18): string[] {
  const current = hongKongYearMonth();
  const [y, m] = current.split("-").map(Number);
  const out: string[] = [];
  let year = y!;
  let month = m!;
  for (let i = 0; i < count; i += 1) {
    out.push(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return out;
}

export function LeaderboardManager() {
  const t = useTranslations("AdminLeaderboard");
  const [yearMonth, setYearMonth] = useState(hongKongYearMonth());
  const [data, setData] = useState<MonthLeaderboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = useCallback(async (month: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/leaderboard?yearMonth=${encodeURIComponent(month)}`,
      );
      const body = (await res.json()) as MonthLeaderboardPayload & {
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "load_failed");
      setData(body);
      setSelectedIds([]);
    } catch {
      setError(t("loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load(yearMonth);
  }, [load, yearMonth]);

  const slotsToFill =
    data?.podium.status === "needs_decision" ? data.podium.slotsToFill : 0;

  const canSettle = useMemo(() => {
    if (!data || data.settled || data.ranking.length === 0) return false;
    if (data.podium.status === "clear") return data.podium.top3.length > 0;
    return selectedIds.length === slotsToFill;
  }, [data, selectedIds.length, slotsToFill]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= slotsToFill) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }

  function moveSelected(id: string, direction: -1 | 1) {
    setSelectedIds((prev) => {
      const index = prev.indexOf(id);
      if (index < 0) return prev;
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next;
    });
  }

  function onSettle() {
    startTransition(async () => {
      setError(null);
      if (!data) return;
      try {
        let podiumVolunteerIds: string[] = [];

        if (data.podium.status === "needs_decision") {
          if (selectedIds.length !== data.podium.slotsToFill) {
            setError(t("decisionRequired"));
            return;
          }
          const resolved = applyPodiumDecision(data.podium, selectedIds);
          if (resolved.status === "needs_decision") {
            // Nested tie — update panel and ask again before calling the API.
            setData({ ...data, podium: resolved });
            setSelectedIds([]);
            return;
          }
          podiumVolunteerIds = resolved.top3.map((item) => item.volunteerId);
        } else {
          podiumVolunteerIds = data.podium.top3.map((item) => item.volunteerId);
        }

        const res = await fetch("/api/leaderboard/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ yearMonth, podiumVolunteerIds }),
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(mapSettleError(body.error, t));
          return;
        }
        await load(yearMonth);
      } catch {
        setError(t("settleFailed"));
      }
    });
  }

  async function downloadCert(id: string) {
    const res = await fetch(`/api/certificates/${id}/download`);
    const body = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !body.url) {
      setError(t("downloadFailed"));
      return;
    }
    window.open(body.url, "_blank", "noopener,noreferrer");
  }

  function regenerateCert(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/certificates/${id}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) {
        setError(t("regenerateFailed"));
        return;
      }
      await load(yearMonth);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          {t("monthLabel")}
          <select
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base"
            value={yearMonth}
            onChange={(event) => setYearMonth(event.target.value)}
          >
            {monthOptions().map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </label>
        <Link
          href="/leaderboard/preview"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand/30 bg-white px-4 text-sm font-semibold text-brand hover:bg-sky-50"
        >
          {t("openPreview")}
        </Link>
      </div>

      {loading ? <p className="text-slate-600">{t("loading")}</p> : null}
      {error ? (
        <p role="alert" className="font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {data?.settled ? (
        <SettlementBanner settlement={data.settled} t={t} />
      ) : null}

      {data && data.podium.status === "needs_decision" && !data.settled ? (
        <TieBreakPanel
          podium={data.podium}
          selectedIds={selectedIds}
          onToggle={toggleSelect}
          onMove={moveSelected}
          t={t}
        />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canSettle || pending || Boolean(data?.settled)}
          onClick={onSettle}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("settling") : t("settle")}
        </button>
        {data?.settled ? (
          <p className="self-center text-sm font-medium text-amber-800">
            {t("lockedHint")}
          </p>
        ) : null}
      </div>

      <RankingTable ranking={data?.ranking ?? []} t={t} />

      <CertificatesTable
        certificates={data?.certificates ?? []}
        pending={pending}
        onDownload={downloadCert}
        onRegenerate={regenerateCert}
        t={t}
      />
    </div>
  );
}

function mapSettleError(
  code: string | undefined,
  t: ReturnType<typeof useTranslations<"AdminLeaderboard">>,
): string {
  switch (code) {
    case "MONTH_ALREADY_SETTLED":
      return t("alreadySettled");
    case "PODIUM_DECISION_REQUIRED":
      return t("decisionRequired");
    case "NO_RANKING_DATA":
      return t("noData");
    default:
      return t("settleFailed");
  }
}

function SettlementBanner({
  settlement,
  t,
}: {
  settlement: SettlementRecord;
  t: ReturnType<typeof useTranslations<"AdminLeaderboard">>;
}) {
  return (
    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950">
      <p className="font-bold">{t("settledTitle")}</p>
      <p className="mt-1 text-sm">
        {t("settledAt", { when: settlement.settledAt })}
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {settlement.podium.map((seat) => (
          <li key={seat.volunteerId}>
            {t("settledSeat", {
              rank: seat.rank,
              name: seat.name,
              points: seat.points,
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TieBreakPanel({
  podium,
  selectedIds,
  onToggle,
  onMove,
  t,
}: {
  podium: Extract<PodiumResolution, { status: "needs_decision" }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  t: ReturnType<typeof useTranslations<"AdminLeaderboard">>;
}) {
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <h2 className="text-lg font-bold text-amber-950">{t("tieTitle")}</h2>
      <p className="mt-1 text-sm text-amber-900">
        {t("tieBody", { count: podium.slotsToFill })}
      </p>
      {podium.lockedPrefix.length > 0 ? (
        <p className="mt-2 text-sm text-amber-900">
          {t("tieLocked", {
            names: podium.lockedPrefix
              .map((item, index) => `${index + 1}. ${item.name}`)
              .join(" · "),
          })}
        </p>
      ) : null}
      <ul className="mt-3 flex flex-col gap-2">
        {podium.tieGroup.map((entry) => {
          const selectedIndex = selectedIds.indexOf(entry.volunteerId);
          const selected = selectedIndex >= 0;
          return (
            <li
              key={entry.volunteerId}
              className={[
                "flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2",
                selected ? "border-brand" : "border-slate-200",
              ].join(" ")}
            >
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(entry.volunteerId)}
                />
                <span>
                  {entry.name} · {entry.points}
                  {t("pointsUnit")} · {t("completed", { count: entry.completedCount })}
                  {selected
                    ? ` · ${t("pickOrder", { order: selectedIndex + 1 })}`
                    : ""}
                </span>
              </label>
              {selected ? (
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-lg border px-2 py-1 text-xs"
                    onClick={() => onMove(entry.volunteerId, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-2 py-1 text-xs"
                    onClick={() => onMove(entry.volunteerId, 1)}
                  >
                    ↓
                  </button>
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RankingTable({
  ranking,
  t,
}: {
  ranking: RankedVolunteer[];
  t: ReturnType<typeof useTranslations<"AdminLeaderboard">>;
}) {
  return (
    <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-bold text-slate-900">{t("top10Title")}</h2>
      </div>
      {ranking.length === 0 ? (
        <p className="px-4 py-6 text-slate-600">{t("noData")}</p>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">{t("colRank")}</th>
              <th className="px-4 py-3 font-semibold">{t("colName")}</th>
              <th className="px-4 py-3 font-semibold">{t("colCompleted")}</th>
              <th className="px-4 py-3 font-semibold">{t("colPoints")}</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row) => (
              <tr key={row.volunteerId} className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold tabular-nums">{row.rank}</td>
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3 tabular-nums">{row.completedCount}</td>
                <td className="px-4 py-3 tabular-nums font-semibold text-brand">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function CertificatesTable({
  certificates,
  pending,
  onDownload,
  onRegenerate,
  t,
}: {
  certificates: CertificateRow[];
  pending: boolean;
  onDownload: (id: string) => void;
  onRegenerate: (id: string) => void;
  t: ReturnType<typeof useTranslations<"AdminLeaderboard">>;
}) {
  return (
    <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-bold text-slate-900">
          {t("certificatesTitle")}
        </h2>
      </div>
      {certificates.length === 0 ? (
        <p className="px-4 py-6 text-slate-600">{t("certificatesEmpty")}</p>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">{t("colRank")}</th>
              <th className="px-4 py-3 font-semibold">{t("colName")}</th>
              <th className="px-4 py-3 font-semibold">{t("colGenerated")}</th>
              <th className="px-4 py-3 font-semibold">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {certificates.map((cert) => (
              <tr key={cert.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold">{cert.rank}</td>
                <td className="px-4 py-3">
                  {cert.volunteerName ?? cert.volunteerId.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-slate-600">{cert.generatedAt}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white"
                      onClick={() => void onDownload(cert.id)}
                    >
                      {t("download")}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                      onClick={() => onRegenerate(cert.id)}
                    >
                      {t("regenerate")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
