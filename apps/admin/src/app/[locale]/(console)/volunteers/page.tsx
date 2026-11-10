import { getTranslations, setRequestLocale } from "next-intl/server";
import { VolunteersManager } from "@/components/management/VolunteersManager";


export const instant = false;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function VolunteersPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AdminManagement");

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-brand">
          {t("volunteersTitle")}
        </h1>
        <p className="max-w-2xl text-base text-slate-700">
          {t("volunteersSubtitle")}
        </p>
      </div>
      <VolunteersManager />
    </section>
  );
}
