"use client";

import { useTranslations } from "next-intl";
import { BigButton } from "@/components/ui/BigButton";

type BackButtonProps = {
  href: string;
  label?: string;
  className?: string;
};

export function BackButton({ href, label, className }: BackButtonProps) {
  const t = useTranslations("Common");

  return (
    <BigButton href={href} variant="neutral" className={className}>
      {label ?? t("back")}
    </BigButton>
  );
}
