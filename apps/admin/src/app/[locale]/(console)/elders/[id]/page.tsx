import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ElderDetailPanel } from "@/components/management/ElderDetailPanel";


export const instant = false;

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

async function ElderDetailLoader({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <ElderDetailPanel id={id} />;
}

export default function ElderDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">…</p>}>
      <ElderDetailLoader params={params} />
    </Suspense>
  );
}
