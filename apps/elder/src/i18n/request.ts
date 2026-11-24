import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import zhHK from "@eldersafe/shared/messages/zh-HK.json";
import { routing } from "./routing";

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
    messages: zhHK,
  };
});
