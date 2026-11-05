import { setRequestLocale } from "next-intl/server";
import { PoliceLocationView } from "@/components/PoliceLocationView";

export const instant = false;

type PolicePageProps = {
  params: Promise<{ locale: string; token: string }>;
};

export default async function PolicePage({ params }: PolicePageProps) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  return <PoliceLocationView token={token} />;
}
