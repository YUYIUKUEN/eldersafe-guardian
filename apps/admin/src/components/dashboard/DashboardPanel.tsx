import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { EmergencyAlertBanner } from "@/components/dashboard/EmergencyAlertBanner";
import { HelpRequestChart } from "@/components/dashboard/HelpRequestChart";
import { requireAdminSession } from "@/lib/auth/require-access";
import { loadDashboardStats } from "@/lib/dashboard/stats";
import { createClient } from "@/lib/supabase/server";

const STAT_KEYS = [
  "eldersTotal",
  "volunteersApproved",
  "volunteersPending",
  "helpToday",
  "helpPending",
  "emergenciesActive",
  "completedMonth",
] as const;

export async function DashboardPanel() {
  await connection();
  await requireAdminSession();
  const t = await getTranslations("AdminDashboard");

  let stats = null;
  let loadError = false;

  try {
    const supabase = await createClient();
    stats = await loadDashboardStats(supabase);
  } catch {
    loadError = true;
  }

  if (loadError || !stats) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
        {t("loadFailed")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <EmergencyAlertBanner initialActiveCount={stats.emergenciesActive} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_KEYS.map((key) => (
          <div
            key={key}
            className={`rounded-xl border px-4 py-4 ${
              key === "emergenciesActive" && stats.emergenciesActive > 0
                ? "border-red-300 bg-red-50"
                : "border-slate-200 bg-white/90"
            }`}
          >
            <p className="text-sm font-medium text-slate-600">{t(`stats.${key}`)}</p>
            <p
              className={`mt-2 text-3xl font-bold tracking-tight ${
                key === "emergenciesActive" && stats.emergenciesActive > 0
                  ? "text-red-700"
                  : "text-slate-900"
              }`}
            >
              {stats[key]}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white/90 px-4 py-5 sm:px-5">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {t("chartTitle")}
        </h2>
        <div className="mt-4">
          <HelpRequestChart data={stats.helpLast7Days} />
        </div>
      </section>
    </div>
  );
}
