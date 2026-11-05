import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Volunteer");
  const auth = await getTranslations("VolunteerAuth");

  return (
    <section className="flex flex-1 flex-col justify-center gap-5 py-10">
      <h1 className="text-4xl font-bold">{t("title")}</h1>
      <p className="max-w-xl text-lg text-slate-700">{t("subtitle")}</p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-xl bg-assist px-5 py-3 font-semibold text-white"
        >
          {auth("login")}
        </Link>
        <Link
          href="/register"
          className="rounded-xl border border-assist px-5 py-3 font-semibold text-assist"
        >
          {auth("register")}
        </Link>
      </div>
    </section>
  );
}
