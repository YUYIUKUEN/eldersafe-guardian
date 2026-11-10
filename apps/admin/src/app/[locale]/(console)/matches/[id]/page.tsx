import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { MatchDetailPanel } from "@/components/matches/MatchDetailPanel";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

async function MatchDetailLoader({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <MatchDetailPanel id={id} />;
}

export default function MatchDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">…</p>}>
      <MatchDetailLoader params={params} />
    </Suspense>
  );
}
