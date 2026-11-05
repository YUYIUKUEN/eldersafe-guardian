import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("HomePage");

  const portals = [
    {
      href: "/elder" as const,
      title: t("elderPortal"),
      accent: "border-danger text-danger",
    },
    {
      href: "/volunteer" as const,
      title: t("volunteerPortal"),
      accent: "border-assist text-assist",
    },
    {
      href: "/admin" as const,
      title: t("adminPortal"),
      accent: "border-brand text-brand",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-8 py-6">
      <section className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-slate-700">
          {t("subtitle")}
        </p>
        <p className="text-base font-medium text-slate-800">
          {t("choosePortal")}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {portals.map((portal) => (
          <Link
            key={portal.href}
            href={portal.href}
            className={`rounded-2xl border-2 bg-white/80 p-6 text-2xl font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${portal.accent}`}
          >
            {portal.title}
          </Link>
        ))}
      </section>
    </div>
  );
}
