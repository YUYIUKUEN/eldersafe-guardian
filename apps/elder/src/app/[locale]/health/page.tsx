import { createSupabaseServiceClient } from "@eldersafe/shared";
import { connection } from "next/server";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { Page } from "@/components/ui/Page";

type HealthPageProps = {
  params: Promise<{ locale: string }>;
};

async function HealthStatus() {
  await connection();

  let ok = false;
  let detail = "";

  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("elders").select("id").limit(1);
    if (error) {
      detail = error.message;
    } else {
      ok = true;
    }
  } catch (error) {
    detail = error instanceof Error ? error.message : "Unknown error";
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-brand">
        {ok ? "已連線資料庫" : "資料庫連線失敗"}
      </h1>
      {!ok && detail ? (
        <p className="text-base text-slate-700">{detail}</p>
      ) : null}
    </>
  );
}

export default async function HealthPage({ params }: HealthPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Page backHref="/">
      <section className="flex flex-1 flex-col justify-center gap-2 py-8">
        <Suspense
          fallback={<p className="text-base text-slate-700">Checking…</p>}
        >
          <HealthStatus />
        </Suspense>
      </section>
    </Page>
  );
}
