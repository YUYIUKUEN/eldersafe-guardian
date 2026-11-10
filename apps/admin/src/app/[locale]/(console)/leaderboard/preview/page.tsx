import { getTranslations, setRequestLocale } from "next-intl/server";
import { CertificatePreviewPanel } from "@/components/leaderboard/CertificatePreviewPanel";
import { requireAdminSession } from "@/lib/auth/require-access";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CertificatePreviewPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminSession();
  const t = await getTranslations("AdminLeaderboard");

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-brand">
          {t("previewPageTitle")}
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-700">
          {t("previewPageSubtitle")}
        </p>
      </div>
      <CertificatePreviewPanel />
    </section>
  );
}
