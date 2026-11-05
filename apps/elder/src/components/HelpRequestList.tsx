"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  confirmHelpRequestComplete,
  listHelpRequests,
  markHelpRequestCompletedForDemo,
  type StoredElderProfile,
  type StoredHelpRequest,
} from "@eldersafe/shared";

type HelpRequestListProps = {
  profile: StoredElderProfile;
  onBack: () => void;
};

export function HelpRequestList({ profile, onBack }: HelpRequestListProps) {
  const t = useTranslations("ElderRequests");
  const [requests, setRequests] = useState<StoredHelpRequest[]>(() =>
    listHelpRequests(profile.deviceKey),
  );

  const statusLabel = useMemo(
    () => ({
      pending: t("statusPending"),
      accepted: t("statusAccepted"),
      completed: t("statusCompleted"),
    }),
    [t],
  );

  function refresh() {
    setRequests(listHelpRequests(profile.deviceKey));
  }

  function confirm(requestId: string) {
    confirmHelpRequestComplete(requestId, profile.deviceKey);
    refresh();
  }

  function demoComplete(requestId: string) {
    markHelpRequestCompletedForDemo(requestId, profile.deviceKey);
    refresh();
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
              {request.audioDataUrl ? (
                <audio className="mt-3 w-full" controls src={request.audioDataUrl} />
              ) : null}
              {request.status === "completed" && !request.elderConfirmedAt ? (
                <button
                  type="button"
                  className="mt-4 min-h-14 w-full rounded-xl bg-brand text-[20px] font-bold text-white"
                  onClick={() => confirm(request.id)}
                >
                  {t("confirmComplete")}
                </button>
              ) : null}
              {request.elderConfirmedAt ? (
                <p className="mt-3 text-[20px] font-semibold text-brand">
                  {t("confirmed")}
                </p>
              ) : null}
              {request.status === "pending" ? (
                <button
                  type="button"
                  className="mt-3 min-h-12 w-full rounded-xl border-2 border-dashed border-slate-400 text-[18px] text-slate-600"
                  onClick={() => demoComplete(request.id)}
                >
                  {t("demoMarkCompleted")}
                </button>
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
