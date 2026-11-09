import { setRequestLocale } from "next-intl/server";
import { ProfileScreen } from "@/components/elder/ProfileScreen";

type ProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileScreen />;
}
