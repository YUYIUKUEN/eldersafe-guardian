import { getTranslations, setRequestLocale } from "next-intl/server";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");

  return (
    <section className="flex flex-1 flex-col justify-center gap-3 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-brand">{t("title")}</h1>
      <p className="max-w-2xl text-lg text-slate-700">{t("subtitle")}</p>
    </section>
  );
}
