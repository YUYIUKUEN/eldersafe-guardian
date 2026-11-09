import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogoutButton } from "@/components/auth/LogoutButton";

type PendingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PendingPage({ params }: PendingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("VolunteerAuth");

  return (
    <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 py-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          {t("pendingTitle")}
        </h1>
        <p className="text-base text-slate-700 sm:text-lg">{t("pendingBody")}</p>
        <p className="text-sm text-slate-600 sm:text-base">{t("pendingHint")}</p>
      </div>
      <LogoutButton />
    </section>
  );
}
