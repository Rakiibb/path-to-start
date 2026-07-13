import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { Coins, TrendingUp, Users, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from "recharts";

const RATE = 2; // ৳ per forced-payment complaint
const CATEGORY = "Forced Payment (2 Taka Collection)";

type Row = {
  id: string;
  created_at: string;
  target_captain_id: string;
  captain: { full_name: string } | null;
};

async function loadRows(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("id, created_at, target_captain_id, captain:users!feedback_target_captain_id_fkey(full_name)")
    .eq("feedback_type", "Captain")
    .eq("category", CATEGORY)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any;
}

function Tile({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ring-1 ${tone}`}>{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-bold text-slate-100 tabular-nums">{value}</div>
    </div>
  );
}

function CorruptionMoneyPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["corruption-money"], queryFn: loadRows });

  useEffect(() => {
    const ch = supabase
      .channel("corruption-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () =>
        qc.invalidateQueries({ queryKey: ["corruption-money"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const rows = q.data ?? [];

  const stats = useMemo(() => {
    const total = rows.length * RATE;
    const uniqueCaptains = new Set(rows.map((r) => r.target_captain_id)).size;
    return { total, count: rows.length, uniqueCaptains };
  }, [rows]);

  const daily = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      m.set(d, (m.get(d) ?? 0) + RATE);
    });
    return Array.from(m, ([date, tk]) => ({
      date,
      label: new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
      tk,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const cumulative = useMemo(() => {
    let running = 0;
    return daily.map((d) => ({ label: d.label, tk: (running += d.tk) }));
  }, [daily]);

  const byCaptain = useMemo(() => {
    const m = new Map<string, { name: string; tk: number }>();
    rows.forEach((r) => {
      const key = r.target_captain_id;
      const name = r.captain?.full_name ?? "Unknown";
      const cur = m.get(key) ?? { name, tk: 0 };
      cur.tk += RATE; m.set(key, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.tk - a.tk);
  }, [rows]);

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <PageLayout
        title="Corruption Money Tracker"
        description={`Each "${CATEGORY}" complaint adds ৳${RATE} to the corruption tally.`}
      >
        {q.isLoading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Tile label="Total Corruption" value={`৳${stats.total}`} icon={<Coins className="h-4 w-4" />} tone="bg-amber-500/10 text-amber-300 ring-amber-500/30" />
              <Tile label="Complaints"       value={stats.count}        icon={<TrendingUp className="h-4 w-4" />} tone="bg-indigo-500/10 text-indigo-300 ring-indigo-500/30" />
              <Tile label="Captains Involved" value={stats.uniqueCaptains} icon={<Users className="h-4 w-4" />} tone="bg-rose-500/10 text-rose-300 ring-rose-500/30" />
            </div>

            <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-lg backdrop-blur">
              <h3 className="mb-4 text-sm font-semibold text-slate-100">Daily Corruption (৳)</h3>
              <div className="h-64">
                {daily.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No complaints yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={daily} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => `৳${v}`} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 12 }} formatter={(v: number) => [`৳${v}`, "Corruption"]} />
                      <Bar dataKey="tk" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-lg backdrop-blur">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">Cumulative Total</h3>
                <div className="h-56">
                  {cumulative.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cumulative} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
                        <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => `৳${v}`} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 12 }} formatter={(v: number) => [`৳${v}`, "Total"]} />
                        <Line type="monotone" dataKey="tk" stroke="#f472b6" strokeWidth={2.5} dot={{ r: 3, fill: "#f472b6" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-lg backdrop-blur">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">By Captain</h3>
                <div className="h-56">
                  {byCaptain.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byCaptain} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} interval={0} angle={-15} height={50} textAnchor="end" />
                        <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => `৳${v}`} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 12 }} formatter={(v: number) => [`৳${v}`, "Corruption"]} />
                        <Bar dataKey="tk" fill="#818cf8" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </PageLayout>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/corruption-money")({
  component: CorruptionMoneyPage,
});
