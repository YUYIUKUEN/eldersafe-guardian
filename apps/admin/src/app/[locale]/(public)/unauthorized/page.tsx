import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogoutButton } from "@/components/auth/LogoutButton";

type UnauthorizedPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function UnauthorizedPage({
  params,
}: UnauthorizedPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AdminUnauthorized");

  return (
    <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 py-16">
      <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-6">
        <h1 className="text-3xl font-bold tracking-tight text-red-800">
          {t("title")}
        </h1>
        <p className="text-base text-red-900/90">{t("body")}</p>
      </div>
      <LogoutButton labelKey="backToLogin" />
    </section>
  );
}
