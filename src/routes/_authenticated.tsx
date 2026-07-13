import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getCurrentAppUser, type Session } from "@/lib/auth";
import { Sidebar } from "@/components/smartclass/Sidebar";
import { Navbar } from "@/components/smartclass/Navbar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentAppUser().then((s) => {
      if (cancelled) return;
      if (!s) {
        queryClient.removeQueries({ queryKey: ["me"] });
        navigate({ to: "/login", replace: true });
        return;
      }
      setSession(s);
      queryClient.setQueryData(["me"], s);
      setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, queryClient]);

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="sticky top-0 z-30 h-screen">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          <Navbar session={session} />
        </div>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}