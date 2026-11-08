import { setRequestLocale } from "next-intl/server";

type RegisterPageProps = {
  params: Promise<{ locale: string }>;
};

/** Stub only — register UI comes later. Proxy allows this path without auth. */
export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <section className="flex flex-1 flex-col justify-center gap-2 py-16">
      <h1 className="text-3xl font-bold text-brand">Volunteer register</h1>
      <p className="text-base text-slate-700">
        Register form not implemented yet.
      </p>
    </section>
  );
}
