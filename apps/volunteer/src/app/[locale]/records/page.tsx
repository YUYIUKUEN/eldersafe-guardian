import { getTranslations, setRequestLocale } from "next-intl/server";
import { RecordsScreen } from "@/components/records/RecordsScreen";
import { VolunteerNav } from "@/components/VolunteerNav";
import { ApprovedSessionGuard } from "@/components/status/ApprovedSessionGuard";
import { requireApprovedVolunteer } from "@/lib/auth/require-access";


export const instant = false;

type RecordsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function RecordsPage({ params }: RecordsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { userId } = await requireApprovedVolunteer();
  const t = await getTranslations("VolunteerRecords");

  return (
    <section className="flex flex-1 flex-col gap-8 py-8 sm:py-12">
      <ApprovedSessionGuard userId={userId} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-base text-slate-700 sm:text-lg">
            {t("subtitle")}
          </p>
        </div>
        <VolunteerNav />
      </div>
      <RecordsScreen />
    </section>
  );
}
