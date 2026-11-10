import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { EmergencyDetailPanel } from "@/components/emergencies/EmergencyDetailPanel";


export const instant = false;

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

async function EmergencyDetailLoader({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <EmergencyDetailPanel id={id} />;
}

export default function EmergencyDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">…</p>}>
      <EmergencyDetailLoader params={params} />
    </Suspense>
  );
}
