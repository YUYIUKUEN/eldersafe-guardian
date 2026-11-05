import { getTranslations, setRequestLocale } from "next-intl/server";

type AdminPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");

  return (
    <section className="flex flex-1 flex-col justify-center py-8">
      <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
    </section>
  );
}
