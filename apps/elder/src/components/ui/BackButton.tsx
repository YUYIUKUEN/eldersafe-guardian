import { getTranslations } from "next-intl/server";
import { BigButton } from "@/components/ui/BigButton";

type BackButtonProps = {
  href: string;
  label?: string;
  className?: string;
};

export async function BackButton({ href, label, className }: BackButtonProps) {
  const t = await getTranslations("Common");

  return (
    <BigButton href={href} variant="neutral" className={className}>
      {label ?? t("back")}
    </BigButton>
  );
}
