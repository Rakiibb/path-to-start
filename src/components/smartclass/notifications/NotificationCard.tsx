import { MessageSquare, Siren, Bell, X } from "lucide-react";
import type { Notification } from "@/services/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function categoryIcon(category: string | null) {
  if (category === "SOS") return Siren;
  if (category === "Feedback") return MessageSquare;
  return Bell;
}

export function NotificationCard({
  n,
  onClick,
  onDelete,
  compact,
}: {
  n: Notification;
  onClick?: (n: Notification) => void;
  onDelete?: (n: Notification) => void;
  compact?: boolean;
}) {
  const Icon = categoryIcon((n as { category?: string | null }).category ?? null);
  const isSos = (n as { category?: string | null }).category === "SOS";
  return (
    <button
      type="button"
      onClick={() => onClick?.(n)}
      className={cn(
        "group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-gray-50",
        n.is_read ? "border-gray-200 bg-white" : "border-sky-200 bg-sky-50/40",
        compact && "p-2.5",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isSos ? "bg-red-100 text-red-600" : "bg-sky-100 text-sky-600",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!n.is_read && <span className="h-2 w-2 rounded-full bg-sky-500" />}
          <p className="truncate text-sm font-medium text-gray-900">{n.title}</p>
        </div>
        {n.message && (
          <p className={cn("text-xs text-gray-600", compact ? "line-clamp-1" : "line-clamp-2")}>
            {n.message}
          </p>
        )}
        <p className="mt-1 text-[11px] text-gray-400">{timeAgo(n.created_at)}</p>
      </div>
      {onDelete && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(n);
          }}
          aria-label="Delete notification"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </button>
  );
}