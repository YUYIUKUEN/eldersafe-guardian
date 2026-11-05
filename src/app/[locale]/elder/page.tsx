import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type ElderPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ElderPage({ params }: ElderPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Elder");
  const common = await getTranslations("Common");

  return (
    <section className="flex flex-1 flex-col justify-center gap-6 py-8">
      <h1 className="text-[28px] font-bold leading-tight text-foreground">
        {t("title")}
      </h1>
      <p className="text-[20px] leading-relaxed text-slate-700">
        {t("comingSoon")}
      </p>
      <p className="text-[20px] leading-relaxed text-slate-700">{t("hint")}</p>
      <Link
        href="/"
        className="inline-flex min-h-14 max-w-sm items-center justify-center rounded-xl bg-brand px-6 text-[20px] font-semibold text-white"
      >
        {common("backHome")}
      </Link>
    </section>
  );
}
