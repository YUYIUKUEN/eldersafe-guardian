"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { VolunteerActivityAction } from "@eldersafe/shared";
import { useRouter } from "@/i18n/navigation";
import { logVolunteerActivity } from "@/lib/auth/activity";
import { createClient } from "@/lib/supabase/browser";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const t = useTranslations("Volunteer");
  const tAuth = useTranslations("VolunteerAuth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onLogout() {
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await logVolunteerActivity({
            action: VolunteerActivityAction.logout,
            userId: user.id,
          });
        }
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          setError(tAuth("logoutFailed"));
          return;
        }
        router.replace("/login");
        router.refresh();
      } catch {
        setError(tAuth("logoutFailed"));
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onLogout}
        disabled={pending}
        className={
          className ??
          "inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-800 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 sm:w-auto"
        }
      >
        {pending ? t("loggingOut") : t("logout")}
      </button>
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
