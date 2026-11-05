import { setRequestLocale } from "next-intl/server";
import { RequestsPanel } from "@/components/RequestsPanel";

type PageProps = { params: Promise<{ locale: string }> };

export const instant = false;

export default async function RequestsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RequestsPanel />;
}
