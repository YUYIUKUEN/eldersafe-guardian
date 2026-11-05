"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { VolunteerShell } from "@/components/VolunteerShell";
import { authHeaders, getSessionToken } from "@/lib/session";

type VolunteerInfo = {
  id: string;
  name: string;
  points: number;
};

type HelpItem = {
  id: string;
  elderName: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  elderConfirmedAt?: string;
};

export function PointsPanel() {
  const t = useTranslations("VolunteerPoints");
  const router = useRouter();
  const [volunteer, setVolunteer] = useState<VolunteerInfo | null>(null);

  useEffect(() => {
    if (!getSessionToken()) {
      router.replace("/login");
      return;
    }
    void fetch("/api/me", { headers: authHeaders() })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await response.json();
        setVolunteer(data.volunteer);
      });
  }, [router]);

  return (
    <VolunteerShell volunteerName={volunteer?.name}>
      <h2 className="text-xl font-bold">{t("title")}</h2>
      <p className="text-2xl font-semibold">
        {t("points", { points: volunteer?.points ?? 0 })}
      </p>
      <p className="text-slate-600">{t("hint")}</p>
    </VolunteerShell>
  );
}

export function RecordsPanel() {
  const t = useTranslations("VolunteerRecords");
  const tr = useTranslations("VolunteerRequests");
  const router = useRouter();
  const [items, setItems] = useState<HelpItem[]>([]);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (!getSessionToken()) {
      router.replace("/login");
      return;
    }
    void fetch("/api/help-requests?mine=1", { headers: authHeaders() }).then(
      async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await response.json();
        setItems(data.items ?? []);
        setName(data.volunteer?.name ?? "");
      },
    );
  }, [router]);

  return (
    <VolunteerShell volunteerName={name}>
      <h2 className="text-xl font-bold">{t("title")}</h2>
      {items.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border bg-white p-4">
              <p className="font-semibold">{item.elderName}</p>
              <p>
                {tr("status")}: {item.status}
              </p>
              <p className="text-sm text-slate-600">
                {tr("createdAt")}: {new Date(item.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </VolunteerShell>
  );
}

export function LeaderboardPanel() {
  const t = useTranslations("VolunteerLeaderboard");
  const [items, setItems] = useState<
    Array<{ id: string; name: string; points: number }>
  >([]);
  const [name, setName] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!getSessionToken()) {
      router.replace("/login");
      return;
    }
    void Promise.all([
      fetch("/api/leaderboard?scope=month").then((response) => response.json()),
      fetch("/api/me", { headers: authHeaders() }).then((response) =>
        response.json(),
      ),
    ]).then(([board, me]) => {
      setItems(board.items ?? []);
      setName(me.volunteer?.name ?? "");
    });
  }, [router]);

  return (
    <VolunteerShell volunteerName={name}>
      <h2 className="text-xl font-bold">{t("title")}</h2>
      <p className="text-sm text-slate-600">{t("monthlyHint")}</p>
      {items.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <table className="w-full overflow-hidden rounded-xl border bg-white text-left">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2">{t("rank")}</th>
              <th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2">{t("points")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2">{item.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </VolunteerShell>
  );
}
