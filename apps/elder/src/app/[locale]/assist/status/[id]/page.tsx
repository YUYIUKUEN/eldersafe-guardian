import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { HelpRequestStatusScreen } from "@/components/elder/HelpRequestStatusScreen";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

type StatusPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

async function StatusContent({ params }: StatusPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <HelpRequestStatusScreen id={id} />;
}

function StatusFallback() {
  return (
    <Page hideLanguageSwitcher>
      <BigText tone="muted">…</BigText>
    </Page>
  );
}

export default function AssistStatusPage({ params }: StatusPageProps) {
  return (
    <Suspense fallback={<StatusFallback />}>
      <StatusContent params={params} />
    </Suspense>
  );
}
