"use client";

import { useTranslations } from "next-intl";
import type { ElderPublicProfile } from "@eldersafe/shared";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";
import { ElderSessionGate } from "./ElderSessionGate";

function HomeContent({ elder }: { elder: ElderPublicProfile }) {
  const t = useTranslations("Elder");
  const tCommon = useTranslations("Common");

  return (
    <Page>
      <BigText as="p" size="caption" tone="brand">
        {tCommon("appName")}
      </BigText>
      <section className="flex flex-1 flex-col justify-center gap-4 text-center">
        <BigText as="h1" size="title" tone="brand">
          {t("welcome", { name: elder.name })}
        </BigText>
        <BigText tone="muted">{t("homeReady")}</BigText>
        <BigButton href="/profile" variant="assist">
          {t("editProfile")}
        </BigButton>
        <BigButton href="/design-test" variant="assistSoft">
          {t("openDesignTest")}
        </BigButton>
      </section>
    </Page>
  );
}

export function HomeScreen() {
  return (
    <ElderSessionGate>
      {(elder) => <HomeContent elder={elder} />}
    </ElderSessionGate>
  );
}
