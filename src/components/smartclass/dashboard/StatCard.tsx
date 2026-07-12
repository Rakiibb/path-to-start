import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
  loading?: boolean;
}

export function StatCard({ icon: Icon, title, value, subtitle, loading }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          <Icon size={18} />
        </div>
      </div>
      {loading ? (
        <div className="mt-3 h-7 w-16 animate-pulse rounded bg-gray-100" />
      ) : (
        <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
      )}
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}