"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ElderPublicProfile } from "@eldersafe/shared";
import { useRouter } from "@/i18n/navigation";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";
import { ElderSessionGate } from "./ElderSessionGate";

const homePrimaryButtonClassName =
  "flex-1 min-h-[140px] whitespace-normal px-4 text-[26px] leading-snug";

function HomeContent({ elder }: { elder: ElderPublicProfile }) {
  const t = useTranslations("Elder");
  const tEmergency = useTranslations("Emergency");
  const router = useRouter();
  const [confirmingEmergency, setConfirmingEmergency] = useState(false);

  if (confirmingEmergency) {
    return (
      <Page>
        <BigText as="h1" size="title" tone="emergency" className="text-center">
          {tEmergency("confirmTitle")}
        </BigText>
        <BigText className="text-center">{tEmergency("confirmBody")}</BigText>

        <section className="flex flex-1 flex-col gap-4 pb-2">
          <BigButton
            variant="emergency"
            className={homePrimaryButtonClassName}
            onClick={() => router.push("/emergency")}
          >
            {tEmergency("confirmYes")}
          </BigButton>
          <BigButton
            variant="neutral"
            className={homePrimaryButtonClassName}
            onClick={() => setConfirmingEmergency(false)}
          >
            {tEmergency("confirmNo")}
          </BigButton>
        </section>
      </Page>
    );
  }

  return (
    <Page>
      <BigText as="h1" size="title" tone="brand" className="text-center">
        {t("welcome", { name: elder.name })}
      </BigText>

      <section className="flex flex-1 flex-col gap-4 pb-2">
        <div className="flex flex-1 flex-col gap-2">
          <BigButton
            variant="emergency"
            className={homePrimaryButtonClassName}
            onClick={() => setConfirmingEmergency(true)}
          >
            {t("emergencyHelp")}
          </BigButton>
          <p className="text-center text-[20px] font-bold leading-snug text-emergency">
            {tEmergency("tapHint")}
          </p>
        </div>
        <BigButton
          href="/assist"
          variant="assist"
          className={homePrimaryButtonClassName}
        >
          {t("needCompany")}
        </BigButton>
        <button
          type="button"
          className="min-h-[72px] w-full text-center text-[22px] font-bold text-brand underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          onClick={() => router.push("/records")}
        >
          {t("myRecordsLink")}
        </button>
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
