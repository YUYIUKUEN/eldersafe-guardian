import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { VolunteerDetailPanel } from "@/components/management/VolunteerDetailPanel";


export const instant = false;

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

async function VolunteerDetailLoader({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <VolunteerDetailPanel id={id} />;
}

export default function VolunteerDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">…</p>}>
      <VolunteerDetailLoader params={params} />
    </Suspense>
  );
}
