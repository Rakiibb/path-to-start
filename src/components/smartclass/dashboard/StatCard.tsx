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
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon size={18} />
        </div>
      </div>
      {loading ? (
        <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      )}
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}