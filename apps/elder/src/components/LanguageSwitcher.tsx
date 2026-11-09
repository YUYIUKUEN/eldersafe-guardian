"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@eldersafe/shared";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

function localeLabel(
  locale: AppLocale,
  t: ReturnType<typeof useTranslations<"Common">>,
) {
  return locale === "zh-HK" ? t("chineseHKShort") : t("english");
}

export function LanguageSwitcher() {
  const t = useTranslations("Common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="grid grid-cols-2 gap-3"
    >
      {routing.locales.map((item) => {
        const active = item === locale;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={active}
            aria-label={localeLabel(item, t)}
            className={[
              "inline-flex min-h-[72px] items-center justify-center rounded-2xl border-2 px-3",
              "text-[24px] font-bold leading-tight tracking-tight",
              "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2",
              "focus-visible:outline-foreground",
              active
                ? "border-assist bg-assist text-assist-fg"
                : "border-border bg-surface text-foreground",
            ].join(" ")}
            onClick={() => {
              if (!active) {
                router.replace(pathname, { locale: item });
              }
            }}
          >
            {localeLabel(item, t)}
          </button>
        );
      })}
    </div>
  );
}
