import { setRequestLocale } from "next-intl/server";
import { HomeScreen } from "@/components/elder/HomeScreen";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeScreen />;
}
