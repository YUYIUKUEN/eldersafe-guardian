"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { VolunteerShell } from "@/components/VolunteerShell";
import { getSupabaseBrowserClient } from "@eldersafe/shared/supabase/browser";
import { subscribeElderSafeRealtime } from "@eldersafe/shared/realtime";
import { authHeaders, getSessionToken } from "@/lib/session";

const LocationMap = dynamic(
  () => import("@/components/LocationMap").then((mod) => mod.LocationMap),
  { ssr: false },
);

type HelpItem = {
  id: string;
  elderName: string;
  elderAge: number;
  elderAddress: string;
  status: "pending" | "accepted" | "completed";
  audioDataUrl?: string;
  audioUrl?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  volunteerId?: string | null;
};

type VolunteerInfo = {
  id: string;
  name: string;
  approved: boolean;
  points: number;
};

export function RequestsPanel() {
  const t = useTranslations("VolunteerRequests");
  const tv = useTranslations("Volunteer");
  const router = useRouter();
  const [items, setItems] = useState<HelpItem[]>([]);
  const [volunteer, setVolunteer] = useState<VolunteerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedMap, setExpandedMap] = useState<string | null>(null);

  async function load() {
    if (!getSessionToken()) {
      router.replace("/login");
      return;
    }
    const response = await fetch("/api/help-requests", {
      headers: authHeaders(),
    });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    const data = await response.json();
    setItems(data.items ?? []);
    setVolunteer(data.volunteer ?? null);
  }

  useEffect(() => {
    void load();
    const client = getSupabaseBrowserClient();
    return subscribeElderSafeRealtime(client, {
      onHelpRequestChange: () => {
        void load();
      },
    });
  }, []);

  async function accept(id: string) {
    setError(null);
    const response = await fetch(`/api/help-requests/${id}/accept`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(
        data.error === "VOLUNTEER_NOT_ALLOWED" ? t("notAllowed") : data.error,
      );
      return;
    }
    await load();
  }

  async function complete(id: string) {
    setError(null);
    const response = await fetch(`/api/help-requests/${id}/complete`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "failed");
      return;
    }
    await load();
  }

  async function demoApprove() {
    const response = await fetch("/api/demo/approve", {
      method: "POST",
      headers: authHeaders(),
    });
    if (response.ok) await load();
  }

  const statusLabel = {
    pending: t("statusPending"),
    accepted: t("statusAccepted"),
    completed: t("statusCompleted"),
  };

  return (
    <VolunteerShell volunteerName={volunteer?.name}>
      <h2 className="text-xl font-bold">{t("title")}</h2>

      {volunteer && !volunteer.approved ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-amber-900">{tv("pendingApproval")}</p>
          <button
            type="button"
            onClick={() => void demoApprove()}
            className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white"
          >
            {tv("demoApprove")}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-red-700">{error}</p> : null}

      {items.length === 0 ? (
        <p className="text-slate-600">{t("empty")}</p>
      ) : (
        <ul className="grid gap-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">
                    {t("elderName")}: {item.elderName}
                  </p>
                  <p>
                    {t("elderAge")}: {item.elderAge}
                  </p>
                  <p>
                    {t("address")}: {item.elderAddress}
                  </p>
                  <p>
                    {t("status")}: {statusLabel[item.status]}
                  </p>
                  <p className="text-sm text-slate-600">
                    {t("createdAt")}: {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {item.status === "pending" ? (
                    <button
                      type="button"
                      onClick={() => void accept(item.id)}
                      className="rounded-lg bg-assist px-3 py-2 font-semibold text-white"
                    >
                      {t("accept")}
                    </button>
                  ) : null}
                  {item.status === "accepted" &&
                  item.volunteerId === volunteer?.id ? (
                    <button
                      type="button"
                      onClick={() => void complete(item.id)}
                      className="rounded-lg bg-brand px-3 py-2 font-semibold text-white"
                    >
                      {t("markComplete")}
                    </button>
                  ) : null}
                  {item.latitude != null && item.longitude != null ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMap((current) =>
                          current === item.id ? null : item.id,
                        )
                      }
                      className="rounded-lg border px-3 py-2 font-semibold"
                    >
                      {t("viewMap")}
                    </button>
                  ) : (
                    <p className="text-sm text-slate-500">{t("noLocation")}</p>
                  )}
                  <Link
                    href={`/requests/${item.id}`}
                    className="rounded-lg border px-3 py-2 text-center font-semibold"
                  >
                    {t("openDetail")}
                  </Link>
                </div>
              </div>

              {item.audioUrl || item.audioDataUrl ? (
                <div className="mt-3">
                  <p className="mb-1 text-sm font-medium">{t("audio")}</p>
                  <audio
                    controls
                    className="w-full"
                    src={item.audioUrl || item.audioDataUrl}
                  />
                </div>
              ) : null}

              {expandedMap === item.id &&
              item.latitude != null &&
              item.longitude != null ? (
                <div className="mt-3">
                  <LocationMap
                    latitude={item.latitude}
                    longitude={item.longitude}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </VolunteerShell>
  );
}
