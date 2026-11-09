import { setRequestLocale } from "next-intl/server";
import { BlankActionPage } from "@/components/elder/BlankActionPage";

type RecordsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function RecordsPage({ params }: RecordsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BlankActionPage titleKey="recordsTitle" bodyKey="recordsBody" />;
}
