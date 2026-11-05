import type { Metadata } from "next";
import { Suspense } from "react";
import { Noto_Sans_HK } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { routing } from "@/i18n/routing";
import "./globals.css";

const notoSansHK = Noto_Sans_HK({
  variable: "--font-noto-sans-hk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Elder" });
  return {
    title: t("title"),
    description: t("subtitle"),
    appleWebApp: {
      capable: true,
      title: t("title"),
      statusBarStyle: "default",
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("Common");

  return (
    <html lang={locale} className={`${notoSansHK.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider messages={messages}>
          <header className="mx-auto flex w-full max-w-md items-center justify-between gap-4 px-4 py-4">
            <p className="text-[20px] font-bold tracking-tight text-brand">
              {t("appName")}
            </p>
            <Suspense fallback={null}>
              <LanguageSwitcher />
            </Suspense>
          </header>
          <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
