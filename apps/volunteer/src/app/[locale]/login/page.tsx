import { setRequestLocale } from "next-intl/server";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
};

/** Stub only — login UI comes later. Proxy allows this path without auth. */
export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <section className="flex flex-1 flex-col justify-center gap-2 py-16">
      <h1 className="text-3xl font-bold text-brand">Volunteer login</h1>
      <p className="text-base text-slate-700">
        Login form not implemented yet. Auth gate redirects here when access is
        denied.
      </p>
    </section>
  );
}
