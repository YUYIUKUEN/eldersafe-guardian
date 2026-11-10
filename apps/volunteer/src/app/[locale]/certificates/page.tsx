import { getTranslations, setRequestLocale } from "next-intl/server";
import { CertificatesScreen } from "@/components/certificates/CertificatesScreen";
import { VolunteerNav } from "@/components/VolunteerNav";
import { ApprovedSessionGuard } from "@/components/status/ApprovedSessionGuard";
import { requireApprovedVolunteer } from "@/lib/auth/require-access";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CertificatesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { userId } = await requireApprovedVolunteer();
  const t = await getTranslations("VolunteerCertificates");

  return (
    <section className="flex flex-1 flex-col gap-6 py-8 sm:py-10">
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
      <CertificatesScreen />
    </section>
  );
}
