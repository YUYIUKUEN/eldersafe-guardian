"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { VolunteerShell } from "@/components/VolunteerShell";
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
  latitude?: number;
  longitude?: number;
  createdAt: string;
};

export function RequestDetailPanel({ id }: { id: string }) {
  const t = useTranslations("VolunteerRequests");
  const common = useTranslations("Common");
  const router = useRouter();
  const [item, setItem] = useState<HelpItem | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!getSessionToken()) {
      router.replace("/login");
      return;
    }
    void fetch("/api/help-requests", { headers: authHeaders() }).then(
      async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await response.json();
        setName(data.volunteer?.name ?? "");
        setItem(
          (data.items as HelpItem[] | undefined)?.find((entry) => entry.id === id) ??
            null,
        );
      },
    );
  }, [id, router]);

  return (
    <VolunteerShell volunteerName={name}>
      <Link href="/requests" className="text-assist underline">
        {common("back")}
      </Link>
      {!item ? (
        <p>{t("empty")}</p>
      ) : (
        <div className="space-y-4 rounded-2xl border bg-white p-4">
          <h2 className="text-xl font-bold">
            {t("elderName")}: {item.elderName}
          </h2>
          <p>
            {t("elderAge")}: {item.elderAge}
          </p>
          <p>
            {t("address")}: {item.elderAddress}
          </p>
          <p>
            {t("status")}: {item.status}
          </p>
          <p>
            {t("createdAt")}: {new Date(item.createdAt).toLocaleString()}
          </p>
          {item.audioDataUrl ? (
            <audio controls className="w-full" src={item.audioDataUrl} />
          ) : null}
          {item.latitude != null && item.longitude != null ? (
            <LocationMap latitude={item.latitude} longitude={item.longitude} />
          ) : (
            <p>{t("noLocation")}</p>
          )}
        </div>
      )}
    </VolunteerShell>
  );
}
