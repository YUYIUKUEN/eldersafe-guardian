import { getTranslations, setRequestLocale } from "next-intl/server";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

type DesignTestPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DesignTestPage({ params }: DesignTestPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("DesignTest");

  return (
    <Page backHref="/">
      <section className="flex flex-col gap-3">
        <BigText as="h1" size="title" tone="brand">
          {t("title")}
        </BigText>
        <BigText tone="muted">{t("subtitle")}</BigText>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="design-buttons">
        <BigText as="h2" id="design-buttons" size="caption" tone="brand">
          {t("sectionButtons")}
        </BigText>
        <BigButton variant="emergency">{t("emergency")}</BigButton>
        <BigButton variant="assist">{t("assist")}</BigButton>
        <BigButton variant="neutral">{t("neutral")}</BigButton>
        <BigButton variant="emergencySoft">{t("emergencySoft")}</BigButton>
        <BigButton variant="assistSoft">{t("assistSoft")}</BigButton>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="design-text">
        <BigText as="h2" id="design-text" size="caption" tone="brand">
          {t("sectionText")}
        </BigText>
        <BigText as="h3" size="title">
          {t("titleSample")}
        </BigText>
        <BigText>{t("bodySample")}</BigText>
        <BigText size="caption" tone="assist">
          {t("captionSample")}
        </BigText>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="design-colors">
        <BigText as="h2" id="design-colors" size="caption" tone="brand">
          {t("sectionColors")}
        </BigText>
        <div className="rounded-2xl bg-emergency px-4 py-5">
          <BigText tone="onEmergency" size="caption">
            {t("colorEmergencyWhite")}
          </BigText>
        </div>
        <div className="rounded-2xl bg-assist px-4 py-5">
          <BigText tone="onAssist" size="caption">
            {t("colorAssistWhite")}
          </BigText>
        </div>
        <div className="rounded-2xl border-2 border-emergency bg-emergency-soft px-4 py-5">
          <BigText tone="emergency" size="caption">
            {t("colorEmergencyDark")}
          </BigText>
        </div>
        <div className="rounded-2xl border-2 border-assist bg-assist-soft px-4 py-5">
          <BigText tone="assist" size="caption">
            {t("colorAssistDark")}
          </BigText>
        </div>
        <BigText tone="muted">{t("colorNote")}</BigText>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="design-page">
        <BigText as="h2" id="design-page" size="caption" tone="brand">
          {t("sectionPage")}
        </BigText>
        <BigText>{t("pageNote")}</BigText>
      </section>
    </Page>
  );
}
