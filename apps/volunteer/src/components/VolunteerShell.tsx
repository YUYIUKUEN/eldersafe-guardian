"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authHeaders, clearSessionToken } from "@/lib/session";

type VolunteerShellProps = {
  children: ReactNode;
  volunteerName?: string;
};

export function VolunteerShell({
  children,
  volunteerName,
}: VolunteerShellProps) {
  const t = useTranslations("Volunteer");
  const common = useTranslations("Common");
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/requests" as const, label: t("navRequests") },
    { href: "/points" as const, label: t("navPoints") },
    { href: "/records" as const, label: t("navRecords") },
    { href: "/leaderboard" as const, label: t("navLeaderboard") },
  ];

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: authHeaders(),
    });
    clearSessionToken();
    router.replace("/login");
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {volunteerName ? (
            <p className="text-sm text-slate-600">{volunteerName}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
        >
          {common("logout")}
        </button>
      </div>

      <nav className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                active
                  ? "bg-assist text-white"
                  : "bg-white text-slate-700 border border-slate-300"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
