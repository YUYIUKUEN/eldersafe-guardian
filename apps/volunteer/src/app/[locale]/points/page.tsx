import { setRequestLocale } from "next-intl/server";
import { PointsPanel } from "@/components/SimplePanels";

type PageProps = { params: Promise<{ locale: string }> };

export const instant = false;

export default async function PointsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PointsPanel />;
}
