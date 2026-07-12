import { useEffect } from "react";
import { Bell } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyNotifications,
  markAsRead,
} from "@/services/notifications.service";
import type { Notification } from "@/services/types";
import { NotificationCard } from "./NotificationCard";

export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: listMyNotifications,
  });
  const list = data ?? [];
  const unread = list.filter((n) => !n.is_read).length;
  const latest = list.slice(0, 10);

  useEffect(() => {
    const ch = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const readM = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function handleClick(n: Notification) {
    if (!n.is_read) readM.mutate(n.id);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">Notifications</p>
          <span className="text-xs text-gray-500">{unread} unread</span>
        </div>
        <div className="max-h-96 space-y-1 overflow-y-auto p-2">
          {latest.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              No notifications available.
            </p>
          ) : (
            latest.map((n) => (
              <NotificationCard key={n.id} n={n} compact onClick={handleClick} />
            ))
          )}
        </div>
        <div className="border-t border-gray-100 p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-sm"
            asChild
          >
            <Link
              to="/notifications"
              onClick={() => navigate({ to: "/notifications" })}
            >
              View All Notifications
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}