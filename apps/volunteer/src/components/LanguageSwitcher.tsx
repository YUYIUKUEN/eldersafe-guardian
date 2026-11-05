"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@eldersafe/shared";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <span className="font-medium">{t("language")}</span>
      <select
        className="rounded border border-slate-300 bg-white px-2 py-1"
        value={locale}
        onChange={(event) =>
          router.replace(pathname, { locale: event.target.value as AppLocale })
        }
        aria-label={t("language")}
      >
        {routing.locales.map((item) => (
          <option key={item} value={item}>
            {item === "zh-HK" ? t("chineseHK") : t("english")}
          </option>
        ))}
      </select>
    </label>
  );
}
