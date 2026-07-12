import type { ReactNode } from "react";

export function PageLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-8">
      <header className="border-b border-border pb-5">
        <h1 className="text-[26px] font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export function PlaceholderCard({ module }: { module: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-soft">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <span className="text-lg font-semibold">✦</span>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{module}</h2>
      <p className="mt-2 text-sm text-muted-foreground">This module is under development.</p>
    </div>
  );
}