import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { listAllFeedback } from "@/services/feedback.service";
import type { Feedback } from "@/services/types";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

type DateRange = "today" | "7d" | "30d" | "all";

const CATEGORIES = [
  "Academic",
  "Fund Issue",
  "Sports",
  "Seating",
  "Class Management",
  "Other",
  "General",
];

const PIE_COLORS = [
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#64748b",
  "#14b8a6",
];

function rangeStart(range: DateRange): Date | null {
  const now = new Date();
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "7d") return new Date(now.getTime() - 7 * 864e5);
  if (range === "30d") return new Date(now.getTime() - 30 * 864e5);
  return null;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message = "No report data available." }: { message?: string }) {
  return (
    <div className="rounded-md border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

function useVoteCounts(ids: string[]) {
  return useQuery({
    queryKey: ["feedback-votes-counts", ids.sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_votes")
        .select("feedback_id, vote")
        .in("feedback_id", ids);
      if (error) throw error;
      const map: Record<string, { yes: number; total: number }> = {};
      for (const row of data ?? []) {
        const m = (map[row.feedback_id] ??= { yes: 0, total: 0 });
        m.total += 1;
        if (row.vote) m.yes += 1;
      }
      return map;
    },
  });
}

function ReportsPage() {
  const qc = useQueryClient();
  const [range, setRange] = useState<DateRange>("all");
  const [search, setSearch] = useState("");

  const { data: allFeedback, isLoading } = useQuery({
    queryKey: ["reports-feedback"],
    queryFn: listAllFeedback,
  });

  useEffect(() => {
    const channel = supabase
      .channel("reports-feedback")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback" },
        () => qc.invalidateQueries({ queryKey: ["reports-feedback"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback_votes" },
        () => qc.invalidateQueries({ queryKey: ["feedback-votes-counts"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const start = rangeStart(range);
  const scoped: Feedback[] = useMemo(() => {
    const list = allFeedback ?? [];
    if (!start) return list;
    return list.filter((f) => new Date(f.created_at) >= start);
  }, [allFeedback, start]);

  const totals = useMemo(() => {
    let total = 0;
    let pending = 0;
    let verified = 0;
    let fundCount = 0;
    let fundAmount = 0;
    for (const f of scoped) {
      total += 1;
      if (f.status === "Pending") pending += 1;
      if (f.status === "Verified") verified += 1;
      if (f.category === "Fund Issue" && f.amount != null) {
        fundCount += 1;
        fundAmount += Number(f.amount);
      }
    }
    return {
      total,
      pending,
      verified,
      fundCount,
      fundAmount,
      fundAvg: fundCount ? fundAmount / fundCount : 0,
    };
  }, [scoped]);

  const categoryData = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        name: c,
        value: scoped.filter((f) => (f.category ?? "General") === c).length,
      })).filter((d) => d.value > 0),
    [scoped],
  );

  const overTimeData = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of scoped) {
      const d = new Date(f.created_at).toISOString().slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [scoped]);

  const verifiedList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped
      .filter((f) => f.status === "Verified")
      .filter((f) => (q ? f.title.toLowerCase().includes(q) : true))
      .slice(0, 10);
  }, [scoped, search]);

  const { data: voteMap } = useVoteCounts(verifiedList.map((f) => f.id));

  if (isLoading) {
    return (
      <PageLayout title="Reports" description="View classroom feedback statistics and trends.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </PageLayout>
    );
  }

  const hasData = (allFeedback ?? []).length > 0;

  return (
    <PageLayout title="Reports" description="View classroom feedback statistics and trends.">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard label="Total Feedback" value={totals.total} />
            <StatCard label="Pending Feedback" value={totals.pending} />
            <StatCard label="Verified Feedback" value={totals.verified} />
            <StatCard label="Total Reported Fund (Tk)" value={totals.fundAmount.toLocaleString()} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feedback by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {categoryData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feedback Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {overTimeData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overTimeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-base">Recent Verified Feedback</CardTitle>
              <Input
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
            </CardHeader>
            <CardContent>
              {verifiedList.length === 0 ? (
                <EmptyState />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vote %</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifiedList.map((f) => {
                      const v = voteMap?.[f.id];
                      const pct = v && v.total > 0 ? Math.round((v.yes / v.total) * 100) : 0;
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.title}</TableCell>
                          <TableCell>{f.category ?? "General"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{f.status}</Badge>
                          </TableCell>
                          <TableCell>{pct}%</TableCell>
                          <TableCell>{new Date(f.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fund Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard label="Total Fund Reports" value={totals.fundCount} />
                <StatCard label="Total Reported Amount (Tk)" value={totals.fundAmount.toLocaleString()} />
                <StatCard
                  label="Average per Report (Tk)"
                  value={totals.fundAvg ? totals.fundAvg.toFixed(2) : "0"}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </PageLayout>
  );
}
