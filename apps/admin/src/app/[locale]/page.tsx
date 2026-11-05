import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type PageProps = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");

  return (
    <section className="flex flex-1 flex-col justify-center gap-5 py-10">
      <h1 className="text-4xl font-bold">{t("title")}</h1>
      <p className="max-w-xl text-lg text-slate-700">{t("subtitle")}</p>
      <Link
        href="/login"
        className="w-fit rounded-xl bg-brand px-5 py-3 font-semibold text-white"
      >
        {t("login")}
      </Link>
    </section>
  );
}
