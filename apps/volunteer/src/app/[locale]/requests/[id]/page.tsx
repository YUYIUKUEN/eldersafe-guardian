import { setRequestLocale } from "next-intl/server";
import { RequestDetailPanel } from "@/components/RequestDetailPanel";

type PageProps = { params: Promise<{ locale: string; id: string }> };

export const instant = false;

export default async function RequestDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <RequestDetailPanel id={id} />;
}
