import { AdminShell } from "@/components/AdminShell";

type ConsoleLayoutProps = {
  children: React.ReactNode;
};

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  return <AdminShell>{children}</AdminShell>;
}
