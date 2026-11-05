import { setRequestLocale } from "next-intl/server";
import { ElderApp } from "@/components/ElderApp";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ElderApp />;
}
