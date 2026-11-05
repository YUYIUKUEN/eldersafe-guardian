import { setRequestLocale } from "next-intl/server";
import { EmergenciesPanel } from "@/components/AdminPanels";

type PageProps = { params: Promise<{ locale: string }> };

export const instant = false;

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <EmergenciesPanel />;
}
