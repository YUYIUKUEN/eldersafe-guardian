import { getTranslations, setRequestLocale } from "next-intl/server";
import { MatchesManager } from "@/components/matches/MatchesManager";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function MatchesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AdminMatches");

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-brand">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-base text-slate-700">{t("subtitle")}</p>
      </div>
      <MatchesManager />
    </section>
  );
}
