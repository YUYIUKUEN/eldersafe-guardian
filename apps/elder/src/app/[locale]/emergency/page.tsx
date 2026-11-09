import { setRequestLocale } from "next-intl/server";
import { BlankActionPage } from "@/components/elder/BlankActionPage";

type EmergencyPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function EmergencyPage({ params }: EmergencyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <BlankActionPage titleKey="emergencyTitle" bodyKey="emergencyBody" />
  );
}
