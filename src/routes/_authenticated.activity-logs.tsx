import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { getCurrentAppUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/activity-logs")({
  component: ActivityLogsPage,
});

type LogRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const ACTIONS = [
  "All",
  "Student Login",
  "Captain Login",
  "Feedback Created",
  "Vote Submitted",
  "SOS Triggered",
  "SOS Resolved",
  "Rule Added",
  "Rule Edited",
  "Rule Deleted",
] as const;

function actionColor(action: string) {
  if (action.includes("SOS")) return "bg-red-100 text-red-700";
  if (action.includes("Login")) return "bg-sky-100 text-sky-700";
  if (action.includes("Feedback")) return "bg-amber-100 text-amber-700";
  if (action.includes("Vote")) return "bg-violet-100 text-violet-700";
  if (action.includes("Rule")) return "bg-emerald-100 text-emerald-700";
  return "bg-gray-100 text-gray-700";
}

function ActivityLogsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getCurrentAppUser,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!meLoading && me && me.role !== "captain") {
      navigate({ to: "/", replace: true });
    }
  }, [me, meLoading, navigate]);

  const [search, setSearch] = useState("");
  const [action, setAction] = useState<(typeof ACTIONS)[number]>("All");
  const [user, setUser] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["activity-logs"],
    enabled: me?.role === "captain",
    queryFn: async (): Promise<LogRow[]> => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  // Realtime
  useEffect(() => {
    if (me?.role !== "captain") return;
    const channel = supabase
      .channel("activity-logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        () => qc.invalidateQueries({ queryKey: ["activity-logs"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, me?.role]);

  const users = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of logs) {
      if (l.actor_id) map.set(l.actor_id, l.actor_name ?? "Unknown");
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return logs.filter((l) => {
      if (action !== "All" && l.action !== action) return false;
      if (user !== "all" && l.actor_id !== user) return false;
      const t = new Date(l.created_at).getTime();
      if (from && t < from) return false;
      if (to && t > to) return false;
      if (q) {
        const hay = `${l.action} ${l.actor_name ?? ""} ${l.entity ?? ""} ${JSON.stringify(l.details ?? {})}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, action, user, dateFrom, dateTo, search]);

  if (meLoading || !me) {
    return (
      <PageLayout title="Activity Logs">
        <div className="text-sm text-gray-500">Loading…</div>
      </PageLayout>
    );
  }
  if (me.role !== "captain") return null;

  return (
    <PageLayout
      title="Activity Logs"
      description="Realtime log of important actions across the classroom."
    >
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2 space-y-1">
            <Label className="text-xs text-gray-600">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Action, user or details…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as typeof action)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">User</Label>
            <Select value={user} onValueChange={setUser}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Date</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading logs…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No activity found for these filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">When</TableHead>
                <TableHead className="w-44">Action</TableHead>
                <TableHead className="w-40">User</TableHead>
                <TableHead className="w-24">Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-gray-600">
                    {new Date(l.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={actionColor(l.action) + " font-medium hover:" + actionColor(l.action)}>
                      {l.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {l.actor_name ?? <span className="text-gray-400">System</span>}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {l.entity ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-xs text-gray-600">
                    {formatDetails(l.details)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="text-xs text-gray-500">
        Showing {filtered.length} of {logs.length} log entries (latest 500).
      </div>
    </PageLayout>
  );
}

function formatDetails(d: Record<string, unknown> | null): string {
  if (!d || Object.keys(d).length === 0) return "—";
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}