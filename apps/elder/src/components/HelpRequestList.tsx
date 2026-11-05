"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  listHelpRequests,
  type StoredElderProfile,
  type StoredHelpRequest,
} from "@eldersafe/shared";

type HelpRequestListProps = {
  profile: StoredElderProfile;
  onBack: () => void;
};

type SharedItem = {
  id: string;
  status: "pending" | "accepted" | "completed";
  audioDataUrl?: string;
  createdAt: string;
  elderConfirmedAt?: string;
};

export function HelpRequestList({ profile, onBack }: HelpRequestListProps) {
  const t = useTranslations("ElderRequests");
  const [requests, setRequests] = useState<Array<StoredHelpRequest | SharedItem>>(
    [],
  );

  async function refresh() {
    try {
      const response = await fetch(
        `/api/help-requests?deviceKey=${encodeURIComponent(profile.deviceKey)}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          setRequests(data.items);
          return;
        }
      }
    } catch {
      // Fall back to local storage below.
    }
    setRequests(listHelpRequests(profile.deviceKey));
  }

  useEffect(() => {
    void refresh();
  }, [profile.deviceKey]);

  const statusLabel = useMemo(
    () => ({
      pending: t("statusPending"),
      accepted: t("statusAccepted"),
      completed: t("statusCompleted"),
    }),
    [t],
  );

  async function confirm(requestId: string) {
    await fetch(`/api/help-requests/${requestId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceKey: profile.deviceKey }),
    });
    await refresh();
  }

  return (
    <section className="flex flex-1 flex-col gap-5 py-6">
      <h1 className="text-[28px] font-bold">{t("title")}</h1>

      {requests.length === 0 ? (
        <p className="text-[20px] text-slate-700">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.map((request) => (
            <li
              key={request.id}
              className="rounded-2xl border-2 border-slate-300 bg-white p-4"
            >
              <p className="text-[22px] font-bold">
                {statusLabel[request.status]}
              </p>
              <p className="mt-2 text-[20px] text-slate-700">
                {t("createdAt")}: {new Date(request.createdAt).toLocaleString()}
              </p>
              {"audioDataUrl" in request && request.audioDataUrl ? (
                <audio
                  className="mt-3 w-full"
                  controls
                  src={request.audioDataUrl}
                />
              ) : null}
              {request.status === "completed" && !request.elderConfirmedAt ? (
                <button
                  type="button"
                  className="mt-4 min-h-14 w-full rounded-xl bg-brand text-[20px] font-bold text-white"
                  onClick={() => void confirm(request.id)}
                >
                  {t("confirmComplete")}
                </button>
              ) : null}
              {request.elderConfirmedAt ? (
                <p className="mt-3 text-[20px] font-semibold text-brand">
                  {t("confirmed")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onBack}
        className="min-h-16 rounded-2xl bg-slate-900 text-[22px] font-bold text-white"
      >
        {t("backHome")}
      </button>
    </section>
  );
}
