import { Search, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { signOut, type Session } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./notifications/NotificationBell";

export function Navbar({ session }: { session: Session | null }) {
  const navigate = useNavigate();

  return (
    <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-6">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search..."
          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-700">
            {session?.name?.[0] ?? "U"}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-gray-900">{session?.name ?? "Guest"}</div>
            <div className="text-xs capitalize text-gray-500">{session?.role ?? "—"}</div>
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