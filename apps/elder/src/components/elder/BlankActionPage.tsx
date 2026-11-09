import { getTranslations } from "next-intl/server";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";

type BlankActionPageProps = {
  titleKey: "emergencyTitle" | "assistTitle" | "recordsTitle";
  bodyKey: "emergencyBody" | "assistBody" | "recordsBody";
};

/** Temporary blank destination until real emergency / assist / records flows exist. */
export async function BlankActionPage({
  titleKey,
  bodyKey,
}: BlankActionPageProps) {
  const t = await getTranslations("Elder");

  return (
    <Page backHref="/">
      <section className="flex flex-1 flex-col justify-center gap-4 text-center">
        <BigText as="h1" size="title" tone="brand">
          {t(titleKey)}
        </BigText>
        <BigText tone="muted">{t(bodyKey)}</BigText>
      </section>
    </Page>
  );
}
