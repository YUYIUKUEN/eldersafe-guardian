import { getTranslations, setRequestLocale } from "next-intl/server";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");

  return (
    <section className="flex flex-1 flex-col justify-center gap-4 py-8">
      <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
      <p className="text-lg leading-relaxed text-slate-700">{t("subtitle")}</p>
    </section>
  );
}
