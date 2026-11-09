import { setRequestLocale } from "next-intl/server";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function EmergenciesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SectionPlaceholder section="emergencies" />;
}
