"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authHeaders, clearSessionToken } from "@/lib/session";

export function AdminShell({
  children,
  adminName,
}: {
  children: ReactNode;
  adminName?: string;
}) {
  const t = useTranslations("Admin");
  const common = useTranslations("Common");
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/users" as const, label: t("navUsers") },
    { href: "/logs" as const, label: t("navLogs") },
    { href: "/pairings" as const, label: t("navPairings") },
    { href: "/activity" as const, label: t("navActivity") },
    { href: "/emergencies" as const, label: t("navEmergencies") },
    { href: "/leaderboard" as const, label: t("navLeaderboard") },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() });
    clearSessionToken();
    router.replace("/login");
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {adminName ? <p className="text-sm text-slate-600">{adminName}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border px-3 py-2 text-sm font-medium"
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
                  ? "bg-brand text-white"
                  : "border border-slate-300 bg-white text-slate-700"
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
