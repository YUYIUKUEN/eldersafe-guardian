"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/management/StatusBadge";
import { Sparkline } from "@/components/activity/Sparkline";
import { formatHkDateTime } from "@/lib/management/format";
import type {
  ActivityLevel,
  ElderEngagement,
  VolunteerEngagement,
} from "@/lib/management/engagement";

type EngagementResponse = {
  volunteers: VolunteerEngagement[];
  elders: ElderEngagement[];
};

function levelTone(level: ActivityLevel) {
  if (level === "high") return "success" as const;
  if (level === "medium") return "warning" as const;
  return "neutral" as const;
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-semibold ${
        active ? "text-brand" : "text-slate-600"
      }`}
    >
      {label}
      {active ? <span aria-hidden="true">{dir === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );
}

export function EngagementPanel() {
  const t = useTranslations("AdminEngagement");
  const tMgmt = useTranslations("AdminManagement");
  const locale = useLocale();
  const [volunteerSortBy, setVolunteerSortBy] = useState("level");
  const [volunteerSortDir, setVolunteerSortDir] = useState<"asc" | "desc">(
    "desc",
  );
  const [elderSortBy, setElderSortBy] = useState("level");
  const [elderSortDir, setElderSortDir] = useState<"asc" | "desc">("desc");
  const [data, setData] = useState<EngagementResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        volunteerSortBy,
        volunteerSortDir,
        elderSortBy,
        elderSortDir,
      });
      const res = await fetch(`/api/engagement?${params.toString()}`);
      if (!res.ok) throw new Error("load_failed");
      setData((await res.json()) as EngagementResponse);
    } catch {
      setError(t("loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [volunteerSortBy, volunteerSortDir, elderSortBy, elderSortDir, t]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  function toggleVolunteerSort(key: string) {
    if (volunteerSortBy === key) {
      setVolunteerSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setVolunteerSortBy(key);
      setVolunteerSortDir("desc");
    }
  }

  function toggleElderSort(key: string) {
    if (elderSortBy === key) {
      setElderSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setElderSortBy(key);
      setElderSortDir("desc");
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
        <h2 className="text-lg font-bold text-slate-900">{t("rulesTitle")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              {t("volunteerRulesTitle")}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>{t("volunteerRules.high")}</li>
              <li>{t("volunteerRules.medium")}</li>
              <li>{t("volunteerRules.low")}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              {t("elderRulesTitle")}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>{t("elderRules.high")}</li>
              <li>{t("elderRules.medium")}</li>
              <li>{t("elderRules.low")}</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-slate-600">{t("rulesNote")}</p>
      </section>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600">{tMgmt("loading")}</p>
      ) : data ? (
        <>
          <section className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-brand">
              {t("volunteersTitle")}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-3">
                      <SortButton
                        label={t("columns.name")}
                        active={volunteerSortBy === "name"}
                        dir={volunteerSortDir}
                        onClick={() => toggleVolunteerSort("name")}
                      />
                    </th>
                    <th className="px-3 py-3">
                      <SortButton
                        label={t("columns.acceptedCount")}
                        active={volunteerSortBy === "acceptedCount"}
                        dir={volunteerSortDir}
                        onClick={() => toggleVolunteerSort("acceptedCount")}
                      />
                    </th>
                    <th className="px-3 py-3">
                      <SortButton
                        label={t("columns.completedCount")}
                        active={volunteerSortBy === "completedCount"}
                        dir={volunteerSortDir}
                        onClick={() => toggleVolunteerSort("completedCount")}
                      />
                    </th>
                    <th className="px-3 py-3">
                      <SortButton
                        label={t("columns.completionRate")}
                        active={volunteerSortBy === "completionRate"}
                        dir={volunteerSortDir}
                        onClick={() => toggleVolunteerSort("completionRate")}
                      />
                    </th>
                    <th className="px-3 py-3">
                      <SortButton
                        label={t("columns.avgResponse")}
                        active={volunteerSortBy === "avgResponseMinutes"}
                        dir={volunteerSortDir}
                        onClick={() => toggleVolunteerSort("avgResponseMinutes")}
                      />
                    </th>
                    <th className="px-3 py-3">
                      <SortButton
                        label={t("columns.lastActiveAt")}
                        active={volunteerSortBy === "lastActiveAt"}
                        dir={volunteerSortDir}
                        onClick={() => toggleVolunteerSort("lastActiveAt")}
                      />
                    </th>
                    <th className="px-3 py-3">
                      <SortButton
                        label={t("columns.level")}
                        active={volunteerSortBy === "level"}
                        dir={volunteerSortDir}
                        onClick={() => toggleVolunteerSort("level")}
                      />
                    </th>
                    <th className="px-3 py-3 font-semibold text-slate-600">
                      {t("columns.trend")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.volunteers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-slate-500">
                        {tMgmt("empty")}
                      </td>
                    </tr>
                  ) : (
                    data.volunteers.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100 hover:bg-slate-50/80"
                      >
                        <td className="px-3 py-3">
                          <Link
                            href={`/volunteers/${item.id}`}
                            className="font-semibold text-brand underline-offset-2 hover:underline"
                          >
                            {item.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {item.acceptedCount}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {item.completedCount}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {item.completionRate}%
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {item.avgResponseMinutes == null
                            ? "—"
                            : t("minutesValue", {
                                count: item.avgResponseMinutes,
                              })}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {formatHkDateTime(item.lastActiveAt, locale)}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge
                            label={t(`level.${item.level}`)}
                            tone={levelTone(item.level)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Sparkline
                            data={item.trend}
                            label={t("trendLabel", { name: item.name })}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-brand">
              {t("eldersTitle")}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-3">
                      <SortButton
                        label={t("columns.name")}
                        active={elderSortBy === "name"}
                        dir={elderSortDir}
                        onClick={() => toggleElderSort("name")}
                      />
                    </th>
                    <th className="px-3 py-3">
                      <SortButton
                        label={t("columns.helpCount")}
                        active={elderSortBy === "helpCount"}
                        dir={elderSortDir}
                        onClick={() => toggleElderSort("helpCount")}
                      />
                    </th>
                    <th className="px-3 py-3">
                      <SortButton
                        label={t("columns.lastActiveAt")}
                        active={elderSortBy === "lastActiveAt"}
                        dir={elderSortDir}
                        onClick={() => toggleElderSort("lastActiveAt")}
                      />
                    </th>
                    <th className="px-3 py-3">
                      <SortButton
                        label={t("columns.level")}
                        active={elderSortBy === "level"}
                        dir={elderSortDir}
                        onClick={() => toggleElderSort("level")}
                      />
                    </th>
                    <th className="px-3 py-3 font-semibold text-slate-600">
                      {t("columns.trend")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.elders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-slate-500">
                        {tMgmt("empty")}
                      </td>
                    </tr>
                  ) : (
                    data.elders.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100 hover:bg-slate-50/80"
                      >
                        <td className="px-3 py-3">
                          <Link
                            href={`/elders/${item.id}`}
                            className="font-semibold text-brand underline-offset-2 hover:underline"
                          >
                            {item.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {item.helpCount}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {formatHkDateTime(item.lastActiveAt, locale)}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge
                            label={t(`level.${item.level}`)}
                            tone={levelTone(item.level)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Sparkline
                            data={item.trend}
                            label={t("trendLabel", { name: item.name })}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
