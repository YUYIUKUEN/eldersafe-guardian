import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type PublicLayoutProps = {
  children: React.ReactNode;
};

export default async function PublicLayout({ children }: PublicLayoutProps) {
  const t = await getTranslations("Common");

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <p className="text-lg font-bold tracking-tight text-brand">{t("appName")}</p>
        <Suspense fallback={null}>
          <LanguageSwitcher />
        </Suspense>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10 sm:px-6">
        {children}
      </main>
    </>
  );
}
