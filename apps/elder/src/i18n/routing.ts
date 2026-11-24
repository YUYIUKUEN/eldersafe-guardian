import { defineRouting } from "next-intl/routing";

/** Elder app is Traditional Chinese (Hong Kong) only — no English switch. */
export const routing = defineRouting({
  locales: ["zh-HK"],
  defaultLocale: "zh-HK",
  localePrefix: "as-needed",
});
