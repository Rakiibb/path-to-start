import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getCurrentAppUser } from "@/lib/auth";
import {
  LayoutDashboard,
  MessageSquare,
  ShieldAlert,
  LayoutGrid,
  FileBarChart,
  Siren,
  BookOpen,
  Bell,
  User,
  GraduationCap,
  Users,
  ListChecks,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/class-feedback", label: "Class Feedback", icon: MessageSquare },
  { to: "/captain-feedback", label: "Captain Feedback", icon: ShieldAlert },
  { to: "/captain-feedback-list", label: "All Captain Feedback", icon: ListChecks },
  { to: "/seat-planner", label: "Seat Planner", icon: LayoutGrid },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/sos", label: "SOS", icon: Siren },
  { to: "/school-rules", label: "School Rules", icon: BookOpen },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const captainItems = [
  { to: "/student-management", label: "Student Management", icon: Users },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: session } = useQuery({
    queryKey: ["me"],
    queryFn: getCurrentAppUser,
    staleTime: 60_000,
  });
  const isCaptain = session?.role === "captain";
  // Captains don't submit feedback themselves — hide the create page from them.
  const baseItems = isCaptain
    ? items.filter((i) => i.to !== "/class-feedback")
    : items;
  const allItems = isCaptain ? [...baseItems, ...captainItems] : baseItems;

  const [collapsed, setCollapsed] = useState<boolean>(false);
  useEffect(() => {
    const v = localStorage.getItem("sc:sidebar-collapsed");
    if (v === "1") setCollapsed(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("sc:sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200",
        collapsed ? "md:w-[72px]" : "md:w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4">
        <div className={cn("flex items-center gap-2 overflow-hidden", collapsed && "justify-center w-full")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">SmartClass</span>
          )}
        </div>
        {!collapsed && (
          <button
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>
      {collapsed && (
        <button
          aria-label="Expand sidebar"
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}
      <nav className="flex-1 space-y-0.5 p-3">
        {allItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                "transition-colors duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
      {!collapsed && session && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {session.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">{session.name}</div>
              <div className="truncate text-[11px] capitalize text-muted-foreground">{session.role}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}