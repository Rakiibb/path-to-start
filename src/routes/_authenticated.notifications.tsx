import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, CheckCheck } from "lucide-react";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyNotifications,
  markAllAsRead,
  markAsRead,
  deleteNotification,
} from "@/services/notifications.service";
import type { Notification } from "@/services/types";
import { NotificationCard } from "@/components/smartclass/notifications/NotificationCard";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

const FILTERS = ["All", "Unread", "Read", "Feedback", "SOS"] as const;
type Filter = (typeof FILTERS)[number];

function NotificationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const q = useQuery({ queryKey: ["notifications"], queryFn: listMyNotifications });

  useEffect(() => {
    const ch = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const readM = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const readAllM = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      toast.success("All marked as read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const delM = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((n) => {
      const cat = (n as { category?: string | null }).category ?? null;
      if (filter === "Unread" && n.is_read) return false;
      if (filter === "Read" && !n.is_read) return false;
      if (filter === "Feedback" && cat !== "Feedback") return false;
      if (filter === "SOS" && cat !== "SOS") return false;
      if (!s) return true;
      return (
        n.title.toLowerCase().includes(s) ||
        (n.message ?? "").toLowerCase().includes(s)
      );
    });
  }, [q.data, search, filter]);

  function handleClick(n: Notification) {
    if (!n.is_read) readM.mutate(n.id);
  }

  const hasAny = (q.data ?? []).length > 0;

  return (
    <PageLayout
      title="Notifications"
      description="View all recent classroom activities and alerts."
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="h-11 pl-9"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => readAllM.mutate()}
          disabled={readAllM.isPending || !hasAny}
        >
          <CheckCheck className="mr-1 h-4 w-4" /> Mark All as Read
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : !hasAny ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No notifications available.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No notifications match your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationCard
              key={n.id}
              n={n}
              onClick={handleClick}
              onDelete={(x) => delM.mutate(x.id)}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
