import { setRequestLocale } from "next-intl/server";
import { VoiceAssistScreen } from "@/components/elder/VoiceAssistScreen";

type AssistPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AssistPage({ params }: AssistPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <VoiceAssistScreen />;
}
