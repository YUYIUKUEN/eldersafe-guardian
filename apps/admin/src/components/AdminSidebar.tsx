"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";

const NAV_ITEMS = [
  { href: "/", key: "dashboard" as const },
  { href: "/elders", key: "elders" as const },
  { href: "/volunteers", key: "volunteers" as const },
  { href: "/matches", key: "matches" as const },
  { href: "/emergencies", key: "emergencies" as const },
  { href: "/logs", key: "logs" as const },
  { href: "/activity", key: "activity" as const },
  { href: "/leaderboard", key: "leaderboard" as const },
];

export function AdminSidebar() {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex w-full flex-col gap-6 border-b border-slate-200 bg-white/80 px-4 py-5 backdrop-blur lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {tCommon("appName")}
        </p>
        <p className="mt-1 text-lg font-bold tracking-tight text-brand">
          {t("brandShort")}
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-1" aria-label={t("title")}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-brand text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden lg:block">
        <LogoutButton />
      </div>
    </aside>
  );
}
