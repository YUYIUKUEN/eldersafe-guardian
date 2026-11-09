import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { VolunteerNav } from "@/components/VolunteerNav";
import { ApprovedSessionGuard } from "@/components/status/ApprovedSessionGuard";
import { requireApprovedVolunteer } from "@/lib/auth/require-access";
import { createClient } from "@/lib/supabase/server";

type ProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { userId, email } = await requireApprovedVolunteer();
  const t = await getTranslations("VolunteerProfile");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("volunteers")
    .select("name, phone, age, service_areas, bio")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return (
      <section className="flex flex-1 flex-col gap-6 py-8">
        <VolunteerNav />
        <p className="text-base font-medium text-red-700" role="alert">
          {t("loadFailed")}
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 py-8 sm:py-12">
      <ApprovedSessionGuard userId={userId} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-base text-slate-700 sm:text-lg">{t("subtitle")}</p>
        </div>
        <VolunteerNav />
      </div>

      <ProfileForm
        initial={{
          email: email ?? "",
          name: data.name,
          phone: data.phone,
          age: data.age,
          serviceAreas: data.service_areas ?? [],
          bio: data.bio ?? "",
        }}
      />
    </section>
  );
}
