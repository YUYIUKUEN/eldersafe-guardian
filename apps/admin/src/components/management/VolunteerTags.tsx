"use client";

import { useTranslations } from "next-intl";
import type { VolunteerTag } from "@eldersafe/shared";
import { StatusBadge } from "./StatusBadge";

const TAG_TONE: Record<
  VolunteerTag,
  "neutral" | "success" | "warning" | "danger"
> = {
  first_time: "neutral",
  inactive: "warning",
  frequent: "success",
};

type VolunteerTagsProps = {
  tags: VolunteerTag[];
  className?: string;
};

export function VolunteerTags({ tags, className }: VolunteerTagsProps) {
  const t = useTranslations("AdminVolunteerTags");
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {tags.map((tag) => (
        <StatusBadge
          key={tag}
          label={t(`tags.${tag}`)}
          tone={TAG_TONE[tag]}
        />
      ))}
    </div>
  );
}
