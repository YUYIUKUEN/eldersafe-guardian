import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <section className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 py-8 sm:py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          {title}
        </h1>
        <p className="text-base text-slate-700 sm:text-lg">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
