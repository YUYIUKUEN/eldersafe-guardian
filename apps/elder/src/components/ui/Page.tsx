import type { ReactNode } from "react";
import { BackButton } from "@/components/ui/BackButton";

type PageProps = {
  children: ReactNode;
  /** When set, shows a large back button at the top of the page. */
  backHref?: string;
  /** Optional override for the back button label. */
  backLabel?: string;
  /**
   * Kept for call-site compatibility. Elder app is zh-HK only;
   * language switcher is not shown.
   */
  hideLanguageSwitcher?: boolean;
  className?: string;
};

export function Page({
  children,
  backHref,
  backLabel,
  className,
}: PageProps) {
  return (
    <div
      className={["flex flex-1 flex-col gap-5 px-4 pb-10 pt-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="flex flex-col gap-3">
        {backHref ? <BackButton href={backHref} label={backLabel} /> : null}
      </header>
      <div className="flex flex-1 flex-col gap-4">{children}</div>
    </div>
  );
}
