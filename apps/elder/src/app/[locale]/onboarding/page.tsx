import { setRequestLocale } from "next-intl/server";
import { OnboardingWizard } from "@/components/elder/OnboardingWizard";
import { OnboardingGate } from "@/components/elder/OnboardingGate";

type OnboardingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <OnboardingGate>
      <OnboardingWizard />
    </OnboardingGate>
  );
}
