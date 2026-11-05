"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AdminShell } from "@/components/AdminShell";
import { getSupabaseBrowserClient } from "@eldersafe/shared/supabase/browser";
import { subscribeElderSafeRealtime } from "@eldersafe/shared/realtime";
import { downloadTop3Certificates } from "@/lib/certificates";
import { authHeaders, getSessionToken } from "@/lib/session";

const LocationMap = dynamic(
  () => import("@/components/LocationMap").then((mod) => mod.LocationMap),
  { ssr: false },
);

function useAdminGuard() {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    if (!getSessionToken()) {
      router.replace("/login");
      return;
    }
    void fetch("/api/me", { headers: authHeaders() }).then(async (response) => {
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await response.json();
      setAdminName(data.admin?.name ?? "");
    });
  }, [router]);

  return adminName;
}

export function UsersPanel() {
  const t = useTranslations("AdminUsers");
  const adminName = useAdminGuard();
  const [elders, setElders] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);

  async function load() {
    const [elderRes, volunteerRes] = await Promise.all([
      fetch("/api/users/elders", { headers: authHeaders() }),
      fetch("/api/users/volunteers", { headers: authHeaders() }),
    ]);
    if (elderRes.ok) setElders((await elderRes.json()).items ?? []);
    if (volunteerRes.ok) setVolunteers((await volunteerRes.json()).items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function patchElder(deviceKey: string, disabled: boolean) {
    await fetch("/api/users/elders", {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ deviceKey, disabled }),
    });
    await load();
  }

  async function patchVolunteer(
    id: string,
    action: "approve" | "disable" | "enable" | "points",
    points?: number,
  ) {
    await fetch("/api/users/volunteers", {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, points }),
    });
    await load();
  }

  return (
    <AdminShell adminName={adminName}>
      <h2 className="text-xl font-bold">{t("title")}</h2>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">{t("elders")}</h3>
        {elders.length === 0 ? (
          <p>{t("emptyElders")}</p>
        ) : (
          <ul className="grid gap-3">
            {elders.map((elder) => (
              <li key={elder.deviceKey} className="rounded-xl border bg-white p-4">
                <p className="font-semibold">{elder.name}</p>
                <p className="text-sm text-slate-600">
                  {elder.age} / {elder.phone} / {elder.address}
                </p>
                <p className="text-sm">
                  {elder.disabled ? t("disabled") : "OK"}
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-lg border px-3 py-2 text-sm font-semibold"
                  onClick={() => void patchElder(elder.deviceKey, !elder.disabled)}
                >
                  {elder.disabled ? t("enable") : t("disable")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">{t("volunteers")}</h3>
        {volunteers.length === 0 ? (
          <p>{t("emptyVolunteers")}</p>
        ) : (
          <ul className="grid gap-3">
            {volunteers.map((volunteer) => (
              <li key={volunteer.id} className="rounded-xl border bg-white p-4">
                <p className="font-semibold">{volunteer.name}</p>
                <p className="text-sm text-slate-600">
                  {volunteer.email} / {volunteer.phone}
                </p>
                <p className="text-sm">
                  {volunteer.approved ? t("approved") : t("pending")}
                  {volunteer.disabled ? ` · ${t("disabled")}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!volunteer.approved ? (
                    <button
                      type="button"
                      className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
                      onClick={() => void patchVolunteer(volunteer.id, "approve")}
                    >
                      {t("approve")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-2 text-sm font-semibold"
                    onClick={() =>
                      void patchVolunteer(
                        volunteer.id,
                        volunteer.disabled ? "enable" : "disable",
                      )
                    }
                  >
                    {volunteer.disabled ? t("enable") : t("disable")}
                  </button>
                </div>
                <form
                  className="mt-3 flex items-center gap-2"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void patchVolunteer(
                      volunteer.id,
                      "points",
                      Number(form.get("points")),
                    );
                  }}
                >
                  <label className="text-sm">
                    {t("points")}
                    <input
                      name="points"
                      type="number"
                      defaultValue={volunteer.points}
                      className="ml-2 w-24 rounded border px-2 py-1"
                    />
                  </label>
                  <button type="submit" className="rounded border px-3 py-1 text-sm">
                    {t("savePoints")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}

export function LogsPanel() {
  const t = useTranslations("AdminLogs");
  const adminName = useAdminGuard();
  const [items, setItems] = useState<any[]>([]);
  const [actorType, setActorType] = useState("");
  const [action, setAction] = useState("");

  async function load(nextActor = actorType, nextAction = action) {
    const params = new URLSearchParams();
    if (nextActor) params.set("actorType", nextActor);
    if (nextAction) params.set("action", nextAction);
    const response = await fetch(`/api/logs?${params.toString()}`, {
      headers: authHeaders(),
    });
    if (response.ok) setItems((await response.json()).items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminShell adminName={adminName}>
      <h2 className="text-xl font-bold">{t("title")}</h2>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label className="text-sm">
          {t("filterActor")}
          <select
            className="ml-2 rounded border px-2 py-1"
            value={actorType}
            onChange={(event) => setActorType(event.target.value)}
          >
            <option value="">{t("all")}</option>
            <option value="elder">elder</option>
            <option value="volunteer">volunteer</option>
            <option value="admin">admin</option>
            <option value="system">system</option>
          </select>
        </label>
        <label className="text-sm">
          {t("filterAction")}
          <input
            className="ml-2 rounded border px-2 py-1"
            value={action}
            onChange={(event) => setAction(event.target.value)}
          />
        </label>
        <button type="submit" className="rounded bg-brand px-3 py-1 text-white">
          {t("apply")}
        </button>
      </form>
      {items.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2">{t("time")}</th>
                <th className="px-3 py-2">{t("actor")}</th>
                <th className="px-3 py-2">{t("action")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{item.actorType}</td>
                  <td className="px-3 py-2">{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

export function PairingsPanel() {
  const t = useTranslations("AdminPairings");
  const adminName = useAdminGuard();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    void fetch("/api/pairings", { headers: authHeaders() }).then(async (response) => {
      if (response.ok) setItems((await response.json()).items ?? []);
    });
  }, []);

  return (
    <AdminShell adminName={adminName}>
      <h2 className="text-xl font-bold">{t("title")}</h2>
      {items.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border bg-white p-4">
              <p className="font-semibold">
                {item.elderName} · {item.status}
              </p>
              <p className="text-sm text-slate-600">{item.elderAddress}</p>
              <p className="text-sm">
                {t("volunteer")}: {item.volunteerName ?? t("unassigned")}
              </p>
              <p className="text-sm text-slate-500">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

export function ActivityPanel() {
  const t = useTranslations("AdminActivity");
  const adminName = useAdminGuard();
  const [elders, setElders] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);

  useEffect(() => {
    void fetch("/api/activity", { headers: authHeaders() }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      setElders(data.elders ?? []);
      setVolunteers(data.volunteers ?? []);
    });
  }, []);

  return (
    <AdminShell adminName={adminName}>
      <h2 className="text-xl font-bold">{t("title")}</h2>
      <section>
        <h3 className="mb-2 font-semibold">{t("elders")}</h3>
        <ul className="grid gap-2">
          {elders.map((item) => (
            <li key={item.id} className="rounded border bg-white p-3 text-sm">
              {item.name}: {t("requests")} {item.requests}, {t("emergencies")}{" "}
              {item.emergencies}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 font-semibold">{t("volunteers")}</h3>
        <ul className="grid gap-2">
          {volunteers.map((item) => (
            <li key={item.id} className="rounded border bg-white p-3 text-sm">
              {item.name}: {t("accepted")} {item.accepted}, {t("completed")}{" "}
              {item.completed}, points {item.points}
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}

export function EmergenciesPanel() {
  const t = useTranslations("AdminEmergencies");
  const adminName = useAdminGuard();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/emergencies", {
        headers: authHeaders(),
      });
      if (response.ok) setItems((await response.json()).items ?? []);
    }
    void load();
    const client = getSupabaseBrowserClient();
    return subscribeElderSafeRealtime(client, {
      onEmergencyChange: () => {
        void load();
      },
    });
  }, []);

  const withLocation = items.filter(
    (item) => item.latitude != null && item.longitude != null,
  );

  return (
    <AdminShell adminName={adminName}>
      <h2 className="text-xl font-bold">{t("title")}</h2>
      {items.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <>
          {withLocation[0] ? (
            <div>
              <h3 className="mb-2 font-semibold">{t("map")}</h3>
              <LocationMap
                latitude={withLocation[0].latitude}
                longitude={withLocation[0].longitude}
              />
            </div>
          ) : null}
          <ul className="grid gap-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border bg-white p-4">
                <p className="font-semibold">{item.elderName}</p>
                <p className="text-sm">
                  {t("createdAt")}: {new Date(item.createdAt).toLocaleString()}
                </p>
                {item.locationUpdatedAt ? (
                  <p className="text-sm">
                    {t("updatedAt")}:{" "}
                    {new Date(item.locationUpdatedAt).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm">{t("noLocation")}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminShell>
  );
}

export function LeaderboardPanel() {
  const t = useTranslations("AdminLeaderboard");
  const adminName = useAdminGuard();
  const [items, setItems] = useState<Array<{ id: string; name: string; points: number }>>(
    [],
  );
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [scope, setScope] = useState<"all" | "month">("month");

  useEffect(() => {
    const query =
      scope === "month"
        ? `/api/leaderboard?scope=month&month=${encodeURIComponent(month)}`
        : "/api/leaderboard";
    void fetch(query, { headers: authHeaders() }).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        setItems(data.items ?? []);
        if (data.month) setMonth(data.month);
      }
    });
  }, [month, scope]);

  return (
    <AdminShell adminName={adminName}>
      <h2 className="text-xl font-bold">{t("title")}</h2>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          {t("scope")}
          <select
            className="ml-2 rounded border px-2 py-1"
            value={scope}
            onChange={(event) => setScope(event.target.value as "all" | "month")}
          >
            <option value="month">{t("thisMonth")}</option>
            <option value="all">{t("allTime")}</option>
          </select>
        </label>
        {scope === "month" ? (
          <label className="text-sm">
            {t("month")}
            <input
              type="month"
              className="ml-2 rounded border px-2 py-1"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <>
          <button
            type="button"
            className="w-fit rounded-xl bg-brand px-4 py-3 font-semibold text-white"
            onClick={() =>
              downloadTop3Certificates(items, {
                title: t("certificateTitle"),
                body: (name, rank) => t("certificateBody", { name, rank }),
              })
            }
          >
            {t("downloadTop3")}
          </button>
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
        </>
      )}
    </AdminShell>
  );
}
