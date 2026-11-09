import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogoutButton } from "@/components/auth/LogoutButton";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Volunteer");

  return (
    <section className="flex flex-1 flex-col justify-center gap-6 py-12 sm:py-16">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-brand">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-lg text-slate-700">{t("subtitle")}</p>
        <p className="max-w-2xl text-base text-slate-600">
          {t("homeApprovedHint")}
        </p>
      </div>
      <LogoutButton />
    </section>
  );
}
