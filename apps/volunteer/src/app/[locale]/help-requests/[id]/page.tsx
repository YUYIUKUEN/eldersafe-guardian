import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  mapVolunteerHelpFeedRow,
} from "@eldersafe/shared";
import { HelpRequestDetail } from "@/components/help/HelpRequestDetail";
import { VolunteerNav } from "@/components/VolunteerNav";
import { ApprovedSessionGuard } from "@/components/status/ApprovedSessionGuard";
import { requireApprovedVolunteer } from "@/lib/auth/require-access";
import { createClient } from "@/lib/supabase/server";

type DetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function HelpRequestDetailPage({
  params,
}: DetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { userId } = await requireApprovedVolunteer();
  const t = await getTranslations("VolunteerHelpDetail");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_volunteer_help_request", {
    target_id: id,
  });

  const row = Array.isArray(data) ? data[0] : data;
  const item = row ? mapVolunteerHelpFeedRow(row) : null;
  if (error || !item) {
    notFound();
  }

  return (
    <section className="flex flex-1 flex-col gap-6 py-8 sm:py-12">
      <ApprovedSessionGuard userId={userId} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("title")}
        </p>
        <VolunteerNav />
      </div>
      <HelpRequestDetail
        helpRequestId={id}
        volunteerId={userId}
        initialItem={item}
      />
    </section>
  );
}
