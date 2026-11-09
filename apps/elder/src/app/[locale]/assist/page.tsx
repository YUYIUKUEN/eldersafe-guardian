import { setRequestLocale } from "next-intl/server";
import { BlankActionPage } from "@/components/elder/BlankActionPage";

type AssistPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AssistPage({ params }: AssistPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BlankActionPage titleKey="assistTitle" bodyKey="assistBody" />;
}
