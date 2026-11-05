import { getTranslations, setRequestLocale } from "next-intl/server";

type ElderPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ElderPage({ params }: ElderPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Elder");

  return (
    <section className="flex flex-1 flex-col justify-center py-8">
      <h1 className="text-[28px] font-bold leading-tight text-foreground">
        {t("title")}
      </h1>
    </section>
  );
}
