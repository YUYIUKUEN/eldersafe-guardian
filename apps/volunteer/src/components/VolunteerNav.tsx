"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";

export function VolunteerNav() {
  const t = useTranslations("Volunteer");
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${
      pathname === href
        ? "bg-brand text-white"
        : "bg-white text-brand ring-1 ring-brand/30 hover:bg-sky-50"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/" className={linkClass("/")}>
        {t("navHome")}
      </Link>
      <Link href="/leaderboard" className={linkClass("/leaderboard")}>
        {t("navLeaderboard")}
      </Link>
      <Link href="/certificates" className={linkClass("/certificates")}>
        {t("navCertificates")}
      </Link>
      <Link href="/profile" className={linkClass("/profile")}>
        {t("navProfile")}
      </Link>
      <LogoutButton className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60" />
    </div>
  );
}
