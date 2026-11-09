"use client";

import { useTranslations } from "next-intl";
import type { ElderPublicProfile } from "@eldersafe/shared";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";
import { ElderSessionGate } from "./ElderSessionGate";

const homePrimaryButtonClassName =
  "flex-1 min-h-[140px] whitespace-normal px-4 text-[26px] leading-snug";

function HomeContent({ elder }: { elder: ElderPublicProfile }) {
  const t = useTranslations("Elder");

  return (
    <Page>
      <BigText as="h1" size="title" tone="brand" className="text-center">
        {t("welcome", { name: elder.name })}
      </BigText>

      <section className="flex flex-1 flex-col gap-4 pb-2">
        <BigButton
          href="/emergency"
          variant="emergency"
          className={homePrimaryButtonClassName}
        >
          {t("emergencyHelp")}
        </BigButton>
        <BigButton
          href="/assist"
          variant="assist"
          className={homePrimaryButtonClassName}
        >
          {t("needCompany")}
        </BigButton>
        <BigButton
          href="/records"
          variant="neutral"
          className="min-h-[88px] whitespace-normal text-[22px] leading-snug"
        >
          {t("myRecords")}
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
