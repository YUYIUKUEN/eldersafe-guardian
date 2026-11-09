import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ApprovalStatusWatcher } from "@/components/status/ApprovalStatusWatcher";
import { requireBlockedVolunteer } from "@/lib/auth/require-access";

type AccountStatusPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AccountStatusPage({
  params,
}: AccountStatusPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { userId, access } = await requireBlockedVolunteer();
  const t = await getTranslations("VolunteerStatus");

  const status = access.approvalStatus === "rejected" ? "rejected" : "disabled";
  const title = status === "rejected" ? t("rejectedTitle") : t("disabledTitle");
  const body = status === "rejected" ? t("rejectedBody") : t("disabledBody");

  return (
    <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 py-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          {title}
        </h1>
        <p className="text-base text-slate-700 sm:text-lg">{body}</p>
        <p className="text-sm text-slate-600 sm:text-base">
          {t("blockedContact", { email: t("adminEmail") })}
        </p>
      </div>
      <ApprovalStatusWatcher
        userId={userId}
        initialStatus={status}
      />
      <LogoutButton />
    </section>
  );
}
