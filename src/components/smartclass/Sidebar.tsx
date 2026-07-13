import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getCurrentAppUser } from "@/lib/auth";
import {
  LayoutDashboard,
  LayoutGrid,
  Siren,
  BookOpen,
  Bell,
  User,
  GraduationCap,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/captain-feedback", hash: "corruption-money", label: "Corruption Money", icon: Coins },
  { to: "/seat-planner", label: "Seat Planner", icon: LayoutGrid },
  { to: "/sos", label: "SOS", icon: Siren },
  { to: "/school-rules", label: "School Rules", icon: BookOpen },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/ai-syllabus", label: "AI Syllabus", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const extraItems = [
  { to: "/student-management", label: "Student Management", icon: Users },
] as const;

export function Sidebar() {
  const location = useRouterState({ select: (s) => s.location });
  const pathname = location.pathname;
  const currentHash = location.hash ?? "";
  const { data: session } = useQuery({
    queryKey: ["me"],
    queryFn: getCurrentAppUser,
    staleTime: 60_000,
  });
  // Everyone (students and captains) sees the same navigation.
  const allItems = [...items, ...extraItems];

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
        {allItems.map((item) => {
          const { to, label, icon: Icon } = item;
          const hash = "hash" in item ? item.hash : undefined;
          const active = pathname === to && (hash ? currentHash === hash : !currentHash);
          return (
            <Link
              key={`${to}-${hash ?? "page"}`}
              to={to}
              hash={hash}
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