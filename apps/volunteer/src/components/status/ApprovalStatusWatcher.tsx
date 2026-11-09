"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { VolunteerApprovalStatus } from "@eldersafe/shared";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";

type ApprovalStatusWatcherProps = {
  userId: string;
  initialStatus: VolunteerApprovalStatus;
};

function destinationForStatus(status: VolunteerApprovalStatus): string | null {
  if (status === "approved") return "/";
  if (status === "pending") return "/pending";
  if (status === "rejected" || status === "disabled") return "/account-status";
  return null;
}

export function ApprovalStatusWatcher({
  userId,
  initialStatus,
}: ApprovalStatusWatcherProps) {
  const t = useTranslations("VolunteerStatus");
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const channel = supabase
      .channel(`volunteer-approval:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "volunteers",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (cancelled) return;
          const next = (payload.new as { approval_status?: string } | null)
            ?.approval_status as VolunteerApprovalStatus | undefined;
          if (!next || next === initialStatus) return;

          const href = destinationForStatus(next);
          if (!href) return;

          setNotice(t("statusUpdating"));
          router.replace(href);
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, initialStatus, router, t]);

  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-sm text-slate-600">{t("listening")}</p>
      {notice ? (
        <p className="text-sm font-medium text-brand">{notice}</p>
      ) : null}
    </div>
  );
}
