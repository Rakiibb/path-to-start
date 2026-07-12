import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentAppUser, type Session } from "@/lib/auth";
import { Sidebar } from "@/components/smartclass/Sidebar";
import { Navbar } from "@/components/smartclass/Navbar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentAppUser().then((s) => {
      if (cancelled) return;
      if (!s) {
        navigate({ to: "/login", replace: true });
        return;
      }
      setSession(s);
      setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar session={session} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}