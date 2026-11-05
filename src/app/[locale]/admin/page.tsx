import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type AdminPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const common = await getTranslations("Common");

  return (
    <section className="flex flex-1 flex-col justify-center gap-5 py-8">
      <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
      <p className="text-lg leading-relaxed text-slate-700">{t("comingSoon")}</p>
      <p className="text-lg leading-relaxed text-slate-700">{t("hint")}</p>
      <Link
        href="/"
        className="inline-flex min-h-12 max-w-xs items-center justify-center rounded-xl bg-brand px-5 text-base font-semibold text-white"
      >
        {common("backHome")}
      </Link>
    </section>
  );
}
