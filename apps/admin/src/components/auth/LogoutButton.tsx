"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AdminActivityAction } from "@eldersafe/shared";
import { useRouter } from "@/i18n/navigation";
import { logAdminActivity } from "@/lib/auth/activity";
import { createClient } from "@/lib/supabase/browser";

type LogoutButtonProps = {
  className?: string;
  labelKey?: "logout" | "backToLogin";
};

export function LogoutButton({ className, labelKey = "logout" }: LogoutButtonProps) {
  const t = useTranslations("Admin");
  const tAuth = useTranslations("AdminAuth");
  const tUnauthorized = useTranslations("AdminUnauthorized");
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
          await logAdminActivity({
            action: AdminActivityAction.logout,
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

  const label =
    labelKey === "backToLogin"
      ? tUnauthorized("backToLogin")
      : pending
        ? t("loggingOut")
        : t("logout");

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onLogout}
        disabled={pending}
        className={
          className ??
          "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        }
      >
        {label}
      </button>
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
