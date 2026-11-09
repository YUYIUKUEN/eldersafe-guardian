import { setRequestLocale } from "next-intl/server";
import { HelpRecordsScreen } from "@/components/elder/HelpRecordsScreen";

type RecordsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function RecordsPage({ params }: RecordsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HelpRecordsScreen />;
}
