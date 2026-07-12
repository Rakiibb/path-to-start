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
    <div className="mx-auto w-full max-w-7xl px-6 pb-10 md:px-10">
      <header className="sticky top-16 z-10 -mx-6 mb-6 border-b border-border/70 bg-background/80 px-6 py-5 backdrop-blur-xl md:-mx-10 md:px-10">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="space-y-8">{children}</div>
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