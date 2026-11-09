import { setRequestLocale } from "next-intl/server";
import { EmergencyScreen } from "@/components/elder/EmergencyScreen";

type EmergencyPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function EmergencyPage({ params }: EmergencyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <EmergencyScreen />;
}
