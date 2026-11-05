import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import en from "@eldersafe/shared/messages/en.json";
import zhHK from "@eldersafe/shared/messages/zh-HK.json";
import { routing } from "./routing";

const messagesByLocale = {
  en,
  "zh-HK": zhHK,
} as const;

export default getRequestConfig(async ({ locale }) => {
  let resolvedLocale = locale;

  if (!resolvedLocale) {
    const paramValue = await rootParams.locale();
    if (hasLocale(routing.locales, paramValue)) {
      resolvedLocale = paramValue;
    } else {
      notFound();
    }
  } else if (!hasLocale(routing.locales, resolvedLocale)) {
    notFound();
  }

  return {
    locale: resolvedLocale,
    messages: messagesByLocale[resolvedLocale as keyof typeof messagesByLocale],
  };
});
