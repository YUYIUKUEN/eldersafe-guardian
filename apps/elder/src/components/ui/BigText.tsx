import type { HTMLAttributes, ReactNode } from "react";

export type BigTextTone =
  | "default"
  | "muted"
  | "brand"
  | "emergency"
  | "assist"
  | "onEmergency"
  | "onAssist";

export type BigTextSize = "title" | "body" | "caption";

export type BigTextProps = {
  children: ReactNode;
  as?: "p" | "h1" | "h2" | "h3" | "span";
  size?: BigTextSize;
  tone?: BigTextTone;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

const sizeClassName: Record<BigTextSize, string> = {
  title: "text-[28px] font-bold leading-tight tracking-tight",
  body: "text-[20px] font-medium leading-relaxed",
  caption: "text-[20px] font-bold leading-snug",
};

const toneClassName: Record<BigTextTone, string> = {
  default: "text-foreground",
  muted: "text-muted",
  brand: "text-brand",
  emergency: "text-emergency",
  assist: "text-assist",
  onEmergency: "text-emergency-fg",
  onAssist: "text-assist-fg",
};

export function BigText({
  children,
  as: Tag = "p",
  size = "body",
  tone = "default",
  className,
  ...rest
}: BigTextProps) {
  const classes = [sizeClassName[size], toneClassName[tone], className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
