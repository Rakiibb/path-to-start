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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function PlaceholderCard({ module }: { module: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600">
        <span className="text-lg font-semibold">✦</span>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">{module}</h2>
      <p className="mt-2 text-sm text-gray-500">This module is under development.</p>
    </div>
  );
}