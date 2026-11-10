import { createSupabaseServiceClient } from "@eldersafe/shared";
import { connection } from "next/server";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

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
    <BigText as="h1" size="title" tone="brand">
      {ok ? t("healthOk") : t("healthFail")}
    </BigText>
  );
}

export default async function HealthPage({ params }: HealthPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Common");

  return (
    <Page backHref="/">
      <section className="flex flex-1 flex-col justify-center gap-2 py-8">
        <Suspense fallback={<BigText tone="muted">{t("healthChecking")}</BigText>}>
          <HealthStatus />
        </Suspense>
      </section>
    </Page>
  );
}
