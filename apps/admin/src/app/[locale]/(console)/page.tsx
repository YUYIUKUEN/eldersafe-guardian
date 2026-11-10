import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";


export const instant = false;

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AdminDashboard");

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-brand">{t("title")}</h1>
        <p className="max-w-2xl text-base text-slate-700">{t("subtitle")}</p>
      </div>
      <Suspense
        fallback={
          <p className="text-sm text-slate-600" role="status">
            …
          </p>
        }
      >
        <DashboardPanel />
      </Suspense>
    </section>
  );
}
