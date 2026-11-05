import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/LoginForm";

type PageProps = { params: Promise<{ locale: string }> };

export default async function LoginPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <section className="py-8">
      <LoginForm />
    </section>
  );
}
