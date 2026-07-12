import { Search, LogOut, AlertTriangle } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { signOut, type Session } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./notifications/NotificationBell";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/class-feedback": "Class Feedback",
  "/captain-feedback": "Captain Feedback",
  "/captain-feedback-list": "All Captain Feedback",
  "/seat-planner": "Seat Planner",
  "/sos": "SOS",
  "/school-rules": "School Rules",
  "/notifications": "Notifications",
  "/ai-syllabus": "AI Syllabus",
  "/profile": "Profile",
  "/student-management": "Student Management",
  "/settings": "Settings",
  "/activity-logs": "Activity Logs",
};

export function Navbar({ session }: { session: Session | null }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = PAGE_TITLES[pathname] ?? "SmartClass";

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-card/80 px-6 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
      <div className="hidden md:block min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          SmartClass
        </div>
        <div className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</div>
      </div>
      <div className="relative ml-4 hidden lg:block w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search anything…"
          className="h-9 w-full rounded-xl border border-border bg-background/60 pl-9 pr-14 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground xl:inline-flex">
          ⌘K
        </kbd>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/sos" })}
          aria-label="SOS Emergency"
          title="SOS Emergency"
          className="group relative inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-red-600/30 ring-1 ring-red-500/50 transition hover:bg-red-700 hover:shadow-red-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75" aria-hidden />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-200" aria-hidden />
          </span>
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>SOS</span>
        </button>
        <NotificationBell />
        <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-1.5 shadow-soft">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {session?.name?.[0] ?? "U"}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-foreground leading-tight">{session?.name ?? "Guest"}</div>
            <div className="text-xs capitalize text-muted-foreground">{session?.role ?? "—"}</div>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Sign out"
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}