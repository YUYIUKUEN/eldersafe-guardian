import { createSupabaseServiceClient } from "@eldersafe/shared";
import { connection } from "next/server";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

type HealthPageProps = {
  params: Promise<{ locale: string }>;
};

async function HealthStatus() {
  await connection();
  const t = await getTranslations("Common");

  let ok = false;
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("elders").select("id").limit(1);
    ok = !error;
  } catch {
    ok = false;
  }

  return (
    <h1 className="text-3xl font-bold text-brand">
      {ok ? t("healthOk") : t("healthFail")}
    </h1>
  );
}

export default async function HealthPage({ params }: HealthPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Common");

  return (
    <section className="flex flex-1 flex-col justify-center gap-2 py-16">
      <Suspense
        fallback={<p className="text-lg text-slate-700">{t("healthChecking")}</p>}
      >
        <HealthStatus />
      </Suspense>
    </section>
  );
}
