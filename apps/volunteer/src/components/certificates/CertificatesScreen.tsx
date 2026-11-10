"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type CertificateItem = {
  id: string;
  yearMonth: string;
  rank: number;
  generatedAt: string;
  filePath: string;
};

export function CertificatesScreen() {
  const t = useTranslations("VolunteerCertificates");
  const [items, setItems] = useState<CertificateItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/volunteers/certificates");
      const body = (await res.json()) as {
        certificates?: CertificateItem[];
        error?: string;
      };
      if (!res.ok || !body.certificates) {
        throw new Error(body.error ?? "load_failed");
      }
      setItems(body.certificates);
    } catch {
      setError(t("loadFailed"));
      setItems([]);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDownload(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/volunteers/certificates/${id}/download`);
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? "download_failed");
      }
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch {
      setError(t("downloadFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {items == null ? (
        <p className="text-slate-600">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"
            >
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {t("itemTitle", {
                    month: item.yearMonth,
                    rank: item.rank,
                  })}
                </p>
                <p className="text-sm text-slate-600">
                  {t("generatedAt", { when: item.generatedAt })}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => void onDownload(item.id)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {busyId === item.id ? t("downloading") : t("download")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
