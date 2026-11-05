import { setRequestLocale } from "next-intl/server";
import { RegisterForm } from "@/components/AuthForms";

type PageProps = { params: Promise<{ locale: string }> };

export default async function RegisterPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <section className="py-8">
      <RegisterForm />
    </section>
  );
}
