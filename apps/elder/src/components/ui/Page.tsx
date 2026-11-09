import type { ReactNode } from "react";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BackButton } from "@/components/ui/BackButton";

type PageProps = {
  children: ReactNode;
  /** When set, shows a large back button at the top of the page. */
  backHref?: string;
  /** Optional override for the back button label. */
  backLabel?: string;
  /** Hide the language switcher (rare; default shows it). */
  hideLanguageSwitcher?: boolean;
  className?: string;
};

export function Page({
  children,
  backHref,
  backLabel,
  hideLanguageSwitcher = false,
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
        {hideLanguageSwitcher ? null : (
          <Suspense fallback={<div className="min-h-[72px]" aria-hidden />}>
            <LanguageSwitcher />
          </Suspense>
        )}
      </header>
      <div className="flex flex-1 flex-col gap-4">{children}</div>
    </div>
  );
}
