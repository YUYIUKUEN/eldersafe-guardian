import { getTranslations, setRequestLocale } from "next-intl/server";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Elder");
  const tCommon = await getTranslations("Common");

  return (
    <Page>
      <BigText as="p" size="caption" tone="brand">
        {tCommon("appName")}
      </BigText>
      <section className="flex flex-1 flex-col justify-center gap-4 text-center">
        <BigText as="h1" size="title" tone="brand">
          {t("title")}
        </BigText>
        <BigText tone="muted">{t("subtitle")}</BigText>
        <BigButton href="/design-test" variant="assist">
          {t("openDesignTest")}
        </BigButton>
      </section>
    </Page>
  );
}
