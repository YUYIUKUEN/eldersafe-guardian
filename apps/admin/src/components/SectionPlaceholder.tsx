import { getTranslations } from "next-intl/server";

type SectionKey =
  | "elders"
  | "volunteers"
  | "matches"
  | "emergencies"
  | "logs"
  | "activity"
  | "leaderboard";

type SectionPlaceholderProps = {
  section: SectionKey;
};

export async function SectionPlaceholder({ section }: SectionPlaceholderProps) {
  const t = await getTranslations("Admin");

  return (
    <section className="space-y-3">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-brand">
          {t(`sections.${section}Title`)}
        </h1>
        <p className="max-w-2xl text-base text-slate-700">
          {t(`sections.${section}Body`)}
        </p>
      </div>
      <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-sm text-slate-500">
        {t("comingSoon")}
      </p>
    </section>
  );
}
