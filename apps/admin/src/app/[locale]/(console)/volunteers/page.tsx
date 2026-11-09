import { setRequestLocale } from "next-intl/server";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function VolunteersPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SectionPlaceholder section="volunteers" />;
}
