import { setRequestLocale } from "next-intl/server";
import { RecordsPanel } from "@/components/SimplePanels";

type PageProps = { params: Promise<{ locale: string }> };

export const instant = false;

export default async function RecordsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RecordsPanel />;
}
