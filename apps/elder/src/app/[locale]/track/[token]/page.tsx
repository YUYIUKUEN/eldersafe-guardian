import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { PoliceTrackScreen } from "@/components/elder/PoliceTrackScreen";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

type TrackPageProps = {
  params: Promise<{ locale: string; token: string }>;
};

async function TrackContent({ params }: TrackPageProps) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  return <PoliceTrackScreen token={token} />;
}

function TrackFallback() {
  return (
    <Page hideLanguageSwitcher>
      <BigText tone="muted">…</BigText>
    </Page>
  );
}

export default function TrackPage({ params }: TrackPageProps) {
  return (
    <Suspense fallback={<TrackFallback />}>
      <TrackContent params={params} />
    </Suspense>
  );
}
