"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatHkDateTime } from "@/lib/management/format";
import { ConfirmDialog } from "@/components/management/ConfirmDialog";

type OverdueItem = {
  id: string;
  elderId: string;
  volunteerId: string | null;
  elderName: string;
  volunteerName: string | null;
  acceptedAt: string | null;
  completedAt: string;
  hoursWaiting: number;
};

export function OverdueConfirmationsPanel() {
  const t = useTranslations("AdminOverdue");
  const locale = useLocale();
  const [items, setItems] = useState<OverdueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<OverdueItem | null>(null);
  const [busy, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/matches/overdue");
      const json = (await res.json().catch(() => ({}))) as {
        items?: OverdueItem[];
        error?: string;
      };
      if (!res.ok) {
        setError(t("loadFailed"));
        setItems([]);
        return;
      }
      setItems(json.items ?? []);
    } catch {
      setError(t("loadFailed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function onConfirm(item: OverdueItem) {
    setPendingId(item.id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/matches/${item.id}/force-confirm`, {
          method: "POST",
        });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) {
          setError(
            json.error === "not_overdue"
              ? t("notOverdue")
              : json.error === "not_confirmable"
                ? t("notConfirmable")
                : t("forceFailed"),
          );
          return;
        }
        setConfirmTarget(null);
        await load();
      } catch {
        setError(t("forceFailed"));
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-amber-950">
          {t("title")}
        </h2>
        <p className="text-sm text-amber-950/80">{t("subtitle")}</p>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-amber-950/70">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-amber-950/70">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1 text-sm text-slate-800">
                <p className="font-semibold text-slate-900">
                  {t("elderLine", { name: item.elderName })}
                  {" · "}
                  {t("volunteerLine", {
                    name: item.volunteerName ?? t("volunteerUnknown"),
                  })}
                </p>
                <p>
                  {t("completedAt", {
                    when: formatHkDateTime(item.completedAt, locale),
                  })}
                </p>
                <p className="font-medium text-amber-900">
                  {t("hoursWaiting", { hours: item.hoursWaiting })}
                </p>
                <Link
                  href={`/matches/${item.id}`}
                  className="inline-flex font-semibold text-brand underline-offset-2 hover:underline"
                >
                  {t("openDetail")}
                </Link>
              </div>
              <button
                type="button"
                disabled={busy && pendingId === item.id}
                onClick={() => setConfirmTarget(item)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy && pendingId === item.id
                  ? t("forcing")
                  : t("forceConfirm")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmTarget != null}
        title={t("confirmTitle")}
        body={
          confirmTarget
            ? t("confirmBody", {
                name: confirmTarget.elderName,
                volunteer:
                  confirmTarget.volunteerName ?? t("volunteerUnknown"),
              })
            : ""
        }
        confirmLabel={t("forceConfirm")}
        pending={busy}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) onConfirm(confirmTarget);
        }}
      />
    </section>
  );
}
