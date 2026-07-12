import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCurrentAppUser } from "@/lib/auth";
import {
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  LayoutGrid,
  FileBarChart,
  Siren,
  BookOpen,
  Bell,
  User,
  GraduationCap,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/class-feedback", label: "Class Feedback", icon: MessageSquare },
  { to: "/feedback", label: "Feedback", icon: MessagesSquare },
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
  const allItems = isCaptain ? [...items, ...captainItems] : items;

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold text-gray-900">SmartClass</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {allItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sky-50 text-sky-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}