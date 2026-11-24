import { setRequestLocale } from "next-intl/server";
import { VolunteerCasesPanel } from "@/components/activity/VolunteerCasesPanel";

export const instant = false;

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function VolunteerCasesPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <VolunteerCasesPanel volunteerId={id} />;
}
