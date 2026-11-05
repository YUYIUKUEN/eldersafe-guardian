import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh-HK", "en"],
  defaultLocale: "zh-HK",
  // Keep product paths as /elder, /volunteer, /admin for the default locale.
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
