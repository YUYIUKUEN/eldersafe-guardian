import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export type BigButtonVariant =
  | "emergency"
  | "assist"
  | "neutral"
  | "emergencySoft"
  | "assistSoft";

type BigButtonBaseProps = {
  children: ReactNode;
  variant?: BigButtonVariant;
  className?: string;
};

type BigButtonAsButton = BigButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type BigButtonAsLink = BigButtonBaseProps & {
  href: string;
  disabled?: boolean;
};

export type BigButtonProps = BigButtonAsButton | BigButtonAsLink;

const variantClassName: Record<BigButtonVariant, string> = {
  emergency:
    "bg-emergency text-emergency-fg border-emergency hover:brightness-95",
  assist: "bg-assist text-assist-fg border-assist hover:brightness-95",
  neutral: "bg-neutral text-neutral-fg border-neutral hover:brightness-95",
  emergencySoft:
    "bg-emergency-soft text-emergency-soft-fg border-emergency hover:brightness-95",
  assistSoft:
    "bg-assist-soft text-assist-soft-fg border-assist hover:brightness-95",
};

function buildClassName(
  variant: BigButtonVariant,
  className?: string,
  disabled?: boolean,
) {
  return [
    "inline-flex w-full items-center justify-center rounded-2xl border-2 px-5",
    "min-h-[72px] text-[24px] font-bold leading-tight tracking-tight",
    "text-center transition-[filter] focus-visible:outline focus-visible:outline-4",
    "focus-visible:outline-offset-2 focus-visible:outline-foreground",
    disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
    variantClassName[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function BigButton({
  children,
  variant = "assist",
  className,
  ...rest
}: BigButtonProps) {
  const disabled = "disabled" in rest ? rest.disabled : undefined;
  const classes = buildClassName(variant, className, disabled);

  if ("href" in rest && rest.href !== undefined) {
    if (disabled) {
      return (
        <span aria-disabled="true" className={classes}>
          {children}
        </span>
      );
    }

    return (
      <Link href={rest.href} className={classes}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as Omit<
    BigButtonAsButton,
    "children" | "variant" | "className"
  >;

  return (
    <button type="button" className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
