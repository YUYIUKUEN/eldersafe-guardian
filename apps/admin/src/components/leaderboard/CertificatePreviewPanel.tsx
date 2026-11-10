"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { hongKongYearMonth } from "@eldersafe/shared";
import { Link } from "@/i18n/navigation";

export function CertificatePreviewPanel() {
  const t = useTranslations("AdminLeaderboard");
  const [volunteerName, setVolunteerName] = useState("陳大文");
  const [yearMonth, setYearMonth] = useState(hongKongYearMonth());
  const [rank, setRank] = useState<1 | 2 | 3>(1);
  const [completedCount, setCompletedCount] = useState(12);
  const [points, setPoints] = useState(120);
  const [orgNameZh, setOrgNameZh] = useState("");
  const [orgNameEn, setOrgNameEn] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPreview(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      setError(null);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      try {
        const res = await fetch("/api/certificates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            volunteerName,
            yearMonth,
            rank,
            completedCount,
            points,
            orgNameZh: orgNameZh.trim() || undefined,
            orgNameEn: orgNameEn.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? "preview_failed");
        }
        const blob = await res.blob();
        setPdfUrl(URL.createObjectURL(blob));
      } catch {
        setError(t("previewFailed"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <form
        onSubmit={onPreview}
        className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            {t("previewTitle")}
          </h2>
          <Link href="/leaderboard" className="text-sm font-semibold text-brand">
            {t("backToLeaderboard")}
          </Link>
        </div>
        <p className="text-sm text-slate-600">{t("previewHint")}</p>

        <label className="text-sm font-semibold text-slate-700">
          {t("previewName")}
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            value={volunteerName}
            onChange={(event) => setVolunteerName(event.target.value)}
            required
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          {t("monthLabel")}
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            value={yearMonth}
            onChange={(event) => setYearMonth(event.target.value)}
            pattern="\d{4}-\d{2}"
            required
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          {t("previewRank")}
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            value={rank}
            onChange={(event) =>
              setRank(Number(event.target.value) as 1 | 2 | 3)
            }
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          {t("previewCompleted")}
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            value={completedCount}
            onChange={(event) => setCompletedCount(Number(event.target.value))}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          {t("previewPoints")}
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            value={points}
            onChange={(event) => setPoints(Number(event.target.value))}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          {t("previewOrgZh")}
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            value={orgNameZh}
            onChange={(event) => setOrgNameZh(event.target.value)}
            placeholder="ElderSafe Guardian"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          {t("previewOrgEn")}
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            value={orgNameEn}
            onChange={(event) => setOrgNameEn(event.target.value)}
            placeholder="ElderSafe Guardian"
          />
        </label>

        {error ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? t("previewGenerating") : t("previewGenerate")}
        </button>
      </form>

      <div className="min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {pdfUrl ? (
          <iframe
            title={t("previewFrameTitle")}
            src={pdfUrl}
            className="h-[70vh] w-full"
          />
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center p-6 text-slate-500">
            {t("previewEmpty")}
          </div>
        )}
      </div>
    </div>
  );
}
