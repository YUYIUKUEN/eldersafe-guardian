import { getTranslations, setRequestLocale } from "next-intl/server";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Elder");

  return (
    <section className="flex flex-1 flex-col justify-center gap-4 py-8">
      <h1 className="text-[28px] font-bold leading-tight text-foreground">{t("title")}</h1>
      <p className="text-[20px] leading-relaxed text-slate-700">{t("subtitle")}</p>
    </section>
  );
}
