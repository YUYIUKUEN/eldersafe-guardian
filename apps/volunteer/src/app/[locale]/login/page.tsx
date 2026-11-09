import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);

  return <LoginForm nextPath={next ?? null} />;
}
