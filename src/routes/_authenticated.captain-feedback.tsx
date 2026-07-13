import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { getCurrentAppUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldAlert, ShieldCheck, Eye, Search, Loader2, Send, Eraser,
  AlertTriangle, CheckCircle2, Clock, FileText, Filter, Inbox,
  UserCog, TrendingUp, X, ChevronLeft, ChevronRight, UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

/* ────────────────────────────────────────────────────────────────
   Config
   ──────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  "Forced Payment (2 Taka Collection)",
  "Food Theft",
  "Bullying",
  "Misbehavior",
  "Abuse of Authority",
  "Other",
] as const;
type Category = (typeof CATEGORIES)[number];

const MIN_DESC = 30;
const MAX_DESC = 800;

/* Warning model: derived from feedback.status.
   Verified => 1 warning issued. Rejected => resolved (no warning).
   Pending  => under review. */
type ReportStatus = "Pending" | "Verified" | "Rejected";

const STATUS_STYLE: Record<ReportStatus, { label: string; cls: string; icon: ReactElement }> = {
  Pending:  { label: "Pending",  cls: "bg-amber-500/10 text-amber-300 border-amber-500/20", icon: <Clock className="h-3 w-3" /> },
  Verified: { label: "Warned",   cls: "bg-rose-500/10 text-rose-300 border-rose-500/20",   icon: <ShieldAlert className="h-3 w-3" /> },
  Rejected: { label: "Resolved", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20", icon: <CheckCircle2 className="h-3 w-3" /> },
};

const CHART_COLORS = ["#818cf8", "#f472b6", "#facc15", "#34d399", "#60a5fa", "#fb923c"];

/* ────────────────────────────────────────────────────────────────
   Types + queries
   ──────────────────────────────────────────────────────────────── */

type Captain = { id: string; full_name: string };
type Report = {
  id: string;
  target_captain_id: string;
  status: ReportStatus;
  created_at: string;
  title: string;
  description: string | null;
  category: string | null;
};
type ReportWithCaptain = Report & { captain: Captain | null };

async function loadCaptains(): Promise<Captain[]> {
  const { data, error } = await supabase.rpc("list_captains_safe");
  if (error) throw error;
  return data ?? [];
}

async function loadAllReports(): Promise<ReportWithCaptain[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("id, target_captain_id, status, created_at, title, description, category, captain:users!feedback_target_captain_id_fkey(id, full_name)")
    .eq("feedback_type", "Captain")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, captain: r.captain ?? null })) as ReportWithCaptain[];
}

/* ────────────────────────────────────────────────────────────────
   Warning helpers
   ──────────────────────────────────────────────────────────────── */

function warningTone(count: number): { ring: string; bar: string; text: string; label: string } {
  if (count >= 3) return { ring: "ring-rose-500/40",   bar: "bg-rose-500",   text: "text-rose-300",   label: "Maximum Warning Reached" };
  if (count === 2) return { ring: "ring-orange-500/40", bar: "bg-orange-500", text: "text-orange-300", label: "High Risk" };
  if (count === 1) return { ring: "ring-yellow-500/40", bar: "bg-yellow-500", text: "text-yellow-300", label: "Caution" };
  return { ring: "ring-emerald-500/30", bar: "bg-emerald-500", text: "text-emerald-300", label: "Clean" };
}

function shortId(uuid: string): string {
  return "RPT-" + uuid.replace(/-/g, "").slice(0, 6).toUpperCase();
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* ────────────────────────────────────────────────────────────────
   Student form
   ──────────────────────────────────────────────────────────────── */

const schema = z.object({
  target_captain_id: z.string().uuid("Select a captain"),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: "Select a category" }) }),
  description: z.string().trim().min(MIN_DESC, `At least ${MIN_DESC} characters`).max(MAX_DESC, `Max ${MAX_DESC}`),
});
type FormValues = z.infer<typeof schema>;

function StudentView({ captains, meId }: { captains: Captain[]; meId: string | null }) {
  const countsQ = useQuery({
    queryKey: ["cf-captain-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("captain_complaint_counts");
      if (error) throw error;
      const map = new Map<string, number>();
      (data ?? []).forEach((r: any) => {
        if (!r.captain_id) return;
        map.set(r.captain_id, Number(r.complaint_count ?? 0));
      });
      return map;
    },
  });
  const [lastId, setLastId] = useState<string | null>(null);
  const {
    register, handleSubmit, watch, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { description: "" } });

  const desc = watch("description") ?? "";
  const captainId = watch("target_captain_id");
  const category = watch("category");

  const onSubmit = async (v: FormValues) => {
    if (!meId) { toast.error("Not signed in"); return; }
    if (v.target_captain_id === meId) { toast.error("You cannot report yourself"); return; }
    const title = v.category; // category is the effective subject; keep description as the body
    const { data, error } = await supabase.from("feedback").insert({
      created_by: meId,
      target_captain_id: v.target_captain_id,
      title,
      description: v.description,
      category: v.category,
      status: "Pending",
      feedback_type: "Captain",
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    setLastId(data.id);
    reset({ target_captain_id: "", category: undefined as any, description: "" });
    toast.success("Report submitted anonymously");
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Form card */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl backdrop-blur">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">New Anonymous Report</h2>
            <p className="text-xs text-slate-400">All fields required. Your identity is not stored on the report.</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Anonymous
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-slate-300">Captain Name</Label>
              <select
                {...register("target_captain_id")}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Select a captain</option>
                {captains.filter((c) => c.id !== meId).map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
              {errors.target_captain_id && <p className="mt-1 text-xs text-rose-400">{errors.target_captain_id.message}</p>}
            </div>
            <div>
              <Label className="text-slate-300">Complaint Category</Label>
              <select
                {...register("category")}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="mt-1 text-xs text-rose-400">{errors.category.message}</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Description</Label>
              <span className={cn(
                "text-xs tabular-nums",
                desc.length < MIN_DESC ? "text-rose-400" : desc.length > MAX_DESC ? "text-rose-400" : "text-slate-400",
              )}>
                {desc.length} / {MAX_DESC}
              </span>
            </div>
            <Textarea
              rows={6}
              placeholder="Describe what happened. Be specific: what, when, where. Keep it factual."
              className="mt-1.5 border-white/10 bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/30"
              {...register("description")}
            />
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={cn(
                  "h-full transition-all",
                  desc.length < MIN_DESC ? "bg-rose-500" : desc.length > MAX_DESC * 0.9 ? "bg-orange-400" : "bg-emerald-500",
                )}
                style={{ width: `${Math.min(100, (desc.length / MAX_DESC) * 100)}%` }}
              />
            </div>
            {errors.description && <p className="mt-1 text-xs text-rose-400">{errors.description.message}</p>}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="text-slate-400 hover:bg-white/5 hover:text-slate-200"
              onClick={() => reset({ target_captain_id: "", category: undefined as any, description: "" })}
            >
              <Eraser className="mr-1.5 h-4 w-4" /> Clear
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !captainId || !category || desc.length < MIN_DESC}
              className="bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              {isSubmitting ? "Submitting…" : "Submit Report"}
            </Button>
          </div>

          {lastId && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Report submitted
              </div>
              <p className="mt-1 text-xs text-emerald-300/80">
                Your report ID is <span className="font-mono font-semibold">{shortId(lastId)}</span>. Teachers will review it shortly.
              </p>
            </div>
          )}
        </form>
      </section>

      {/* Info card */}
      <aside className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-slate-900/40 to-slate-900/40 p-6 shadow-2xl backdrop-blur">
        <h3 className="text-sm font-semibold text-slate-100">How this works</h3>
        <p className="mt-1 text-xs text-slate-400">Read before submitting.</p>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          {[
            { i: <ShieldCheck className="h-4 w-4" />, t: "Reports are anonymous", d: "Your name is never attached to the report shown to captains." },
            { i: <AlertTriangle className="h-4 w-4" />, t: "Fake reports are discouraged", d: "False or malicious reports may be rejected." },
            { i: <UserCog className="h-4 w-4" />, t: "Teachers review reports", d: "Only staff can issue warnings or resolve cases." },
            { i: <ShieldAlert className="h-4 w-4" />, t: "Identity is never stored", d: "Reports are shown to teachers without your handle." },
          ].map((x, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30">{x.i}</span>
              <div>
                <div className="text-sm font-medium text-slate-100">{x.t}</div>
                <div className="text-xs text-slate-400">{x.d}</div>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      </div>

      {/* Complaint counts per captain */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl backdrop-blur">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">Complaints by Captain</h2>
            <p className="text-xs text-slate-400">Total complaints submitted against each captain.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {captains.map((c) => {
            const count = countsQ.data?.get(c.id) ?? 0;
            const tone =
              count >= 5 ? { ring: "ring-rose-500/40", text: "text-rose-300", bg: "bg-rose-500/10" }
              : count >= 2 ? { ring: "ring-amber-500/40", text: "text-amber-300", bg: "bg-amber-500/10" }
              : { ring: "ring-emerald-500/30", text: "text-emerald-300", bg: "bg-emerald-500/10" };
            return (
              <div key={c.id} className={cn("rounded-2xl border border-white/10 bg-slate-950/40 p-5 ring-1", tone.ring)}>
                <div className="flex items-center gap-3">
                  <div className={cn("grid h-11 w-11 place-items-center rounded-xl ring-1", tone.bg, tone.ring, tone.text)}>
                    <UserCircle2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">{c.full_name}</div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">Captain</div>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className={cn("text-3xl font-bold tabular-nums", tone.text)}>
                      {countsQ.isLoading ? "…" : count}
                    </div>
                    <div className="text-xs text-slate-400">Total complaints</div>
                  </div>
                  <FileText className="h-5 w-5 text-slate-500" />
                </div>
                {/* Capacity meter: max 3 complaints */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Capacity</span>
                    <span className={cn("font-semibold tabular-nums", tone.text)}>
                      {Math.min(count, 3)} / 3
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-2 flex-1 rounded-full ring-1 transition-colors",
                          i < Math.min(count, 3)
                            ? cn(
                                count >= 3 ? "bg-rose-500 ring-rose-500/40"
                                : count === 2 ? "bg-amber-500 ring-amber-500/40"
                                : "bg-yellow-500 ring-yellow-500/40",
                              )
                            : "bg-white/5 ring-white/10",
                        )}
                      />
                    ))}
                  </div>
                  <div className={cn("mt-1.5 text-[10px] uppercase tracking-wide", tone.text)}>
                    {count >= 3 ? "Limit reached" : count === 2 ? "1 slot left" : `${3 - count} slots left`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Teacher view
   ──────────────────────────────────────────────────────────────── */

function StatTile({
  label, value, icon, tone,
}: { label: string; value: number | string; icon: ReactElement; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <span className={cn("grid h-9 w-9 place-items-center rounded-xl ring-1", tone)}>{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-bold text-slate-100 tabular-nums">{value}</div>
    </div>
  );
}

function WarningMeter({ count, name }: { count: number; name: string }) {
  const capped = Math.min(3, count);
  const tone = warningTone(capped);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <span className="truncate text-sm font-medium text-slate-100">{name}</span>
        <span className={cn("text-xs font-semibold tabular-nums", tone.text)}>{capped} / 3</span>
      </div>
      <div className="mt-2 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full ring-1 transition-colors",
              i < capped ? cn(tone.bar, tone.ring) : "bg-white/5 ring-white/10",
            )}
          />
        ))}
      </div>
      <div className={cn("mt-2 text-[11px] font-medium uppercase tracking-wide", tone.text)}>{tone.label}</div>
    </div>
  );
}

const PAGE_SIZE = 8;

function TeacherView({ reports, captains }: { reports: ReportWithCaptain[]; captains: Captain[] }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [capF, setCapF] = useState<string>("all");
  const [catF, setCatF] = useState<string>("all");
  const [statF, setStatF] = useState<string>("all");
  const [sort, setSort] = useState<"new" | "old">("new");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReportWithCaptain | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = reports.filter((r) => {
      if (capF !== "all" && r.target_captain_id !== capF) return false;
      if (catF !== "all" && (r.category ?? "") !== catF) return false;
      if (statF !== "all" && r.status !== statF) return false;
      if (!q) return true;
      return (
        (r.title ?? "").toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.captain?.full_name ?? "").toLowerCase().includes(q) ||
        shortId(r.id).toLowerCase().includes(q)
      );
    });
    rows = rows.slice().sort((a, b) => {
      const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sort === "new" ? -t : t;
    });
    return rows;
  }, [reports, search, capF, catF, statF, sort]);

  useEffect(() => { setPage(1); }, [search, capF, catF, statF, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => {
    const pending  = reports.filter((r) => r.status === "Pending").length;
    const resolved = reports.filter((r) => r.status === "Rejected").length;
    const warned   = reports.filter((r) => r.status === "Verified").length;
    return { total: reports.length, pending, resolved, warned };
  }, [reports]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    reports.forEach((r) => { const k = r.category ?? "Other"; m.set(k, (m.get(k) ?? 0) + 1); });
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [reports]);

  const byCaptain = useMemo(() => {
    const m = new Map<string, { name: string; count: number }>();
    reports.forEach((r) => {
      const key = r.target_captain_id;
      const name = r.captain?.full_name ?? "Unknown";
      const cur = m.get(key) ?? { name, count: 0 };
      cur.count += 1; m.set(key, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [reports]);

  const warningsByCaptain = useMemo(() => {
    const m = new Map<string, { name: string; warnings: number }>();
    captains.forEach((c) => m.set(c.id, { name: c.full_name, warnings: 0 }));
    reports.forEach((r) => {
      if (r.status !== "Verified") return;
      const cur = m.get(r.target_captain_id);
      if (cur) cur.warnings += 1;
    });
    return Array.from(m.values()).sort((a, b) => b.warnings - a.warnings);
  }, [reports, captains]);

  async function updateStatus(id: string, status: ReportStatus) {
    setBusy(true);
    const { error } = await supabase.from("feedback").update({ status }).eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "Verified" ? "Warning issued" : status === "Rejected" ? "Report resolved" : "Reopened");
    qc.invalidateQueries({ queryKey: ["cf-reports"] });
    setSelected(null);
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Reports"   value={totals.total}    icon={<FileText className="h-4 w-4" />}    tone="bg-indigo-500/10 text-indigo-300 ring-indigo-500/30" />
        <StatTile label="Pending"         value={totals.pending}  icon={<Clock className="h-4 w-4" />}       tone="bg-amber-500/10 text-amber-300 ring-amber-500/30" />
        <StatTile label="Resolved"        value={totals.resolved} icon={<CheckCircle2 className="h-4 w-4" />} tone="bg-emerald-500/10 text-emerald-300 ring-emerald-500/30" />
        <StatTile label="Warnings Issued" value={totals.warned}   icon={<ShieldAlert className="h-4 w-4" />} tone="bg-rose-500/10 text-rose-300 ring-rose-500/30" />
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 shadow-lg backdrop-blur">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,auto))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search ID, captain, keyword…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-white/10 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <select value={capF} onChange={(e) => setCapF(e.target.value)} className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
            <option value="all">All Captains</option>
            {captains.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
          <select value={catF} onChange={(e) => setCatF(e.target.value)} className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statF} onChange={(e) => setStatF(e.target.value)} className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Warned</option>
            <option value="Rejected">Resolved</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as "new" | "old")} className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
            <option value="new">Newest First</option>
            <option value="old">Oldest First</option>
          </select>
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-100">Reports</h3>
            <span className="text-xs text-slate-400">({filtered.length})</span>
          </div>
          <div className="hidden items-center gap-1 text-xs text-slate-400 md:flex">
            <Filter className="h-3 w-3" /> {sort === "new" ? "Newest first" : "Oldest first"}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-slate-500 ring-1 ring-white/10">
              <Inbox className="h-8 w-8" />
            </div>
            <p className="text-sm text-slate-300">No reports submitted yet.</p>
            <p className="text-xs text-slate-500">When students submit reports, they will appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Report ID</th>
                    <th className="px-5 py-3 font-medium">Captain</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const s = STATUS_STYLE[r.status];
                    return (
                      <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                        <td className="px-5 py-3 font-mono text-xs text-indigo-300">{shortId(r.id)}</td>
                        <td className="px-5 py-3 text-slate-200">{r.captain?.full_name ?? "—"}</td>
                        <td className="px-5 py-3 text-slate-300">{r.category ?? "—"}</td>
                        <td className="px-5 py-3 text-slate-400">{fmtDateTime(r.created_at)}</td>
                        <td className="px-5 py-3">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", s.cls)}>
                            {s.icon}{s.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => setSelected(r)}
                            className="h-8 gap-1 text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200"
                          >
                            <Eye className="h-4 w-4" /> View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-slate-400">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 text-slate-300 hover:bg-white/5">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 text-slate-300 hover:bg-white/5">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Warnings */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-lg backdrop-blur">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-300" />
          <h3 className="text-sm font-semibold text-slate-100">Warning Distribution</h3>
          <span className="ml-auto text-xs text-slate-400">3 warnings = max</span>
        </div>
        {warningsByCaptain.length === 0 ? (
          <p className="text-sm text-slate-400">No captains registered.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {warningsByCaptain.map((w) => (
              <WarningMeter key={w.name} name={w.name} count={w.warnings} />
            ))}
          </div>
        )}
      </section>

      {/* Analytics */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-lg backdrop-blur">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-300" />
            <h3 className="text-sm font-semibold text-slate-100">Reports by Category</h3>
          </div>
          <div className="h-64">
            {byCategory.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={90} paddingAngle={2}>
                    {byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-lg backdrop-blur">
          <div className="mb-4 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-pink-300" />
            <h3 className="text-sm font-semibold text-slate-100">Reports by Captain</h3>
          </div>
          <div className="h-64">
            {byCaptain.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCaptain} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} height={50} textAnchor="end" />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#f472b6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg border-white/10 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm text-indigo-300">{selected && shortId(selected.id)}</span>
              {selected && (
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[selected.status].cls)}>
                  {STATUS_STYLE[selected.status].icon}{STATUS_STYLE[selected.status].label}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Captain</div>
                  <div className="mt-0.5 text-sm font-medium text-slate-100">{selected.captain?.full_name ?? "—"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Category</div>
                  <div className="mt-0.5 text-sm font-medium text-slate-100">{selected.category ?? "—"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-500">Submitted</div>
                  <div className="mt-0.5 text-sm text-slate-100">{fmtDateTime(selected.created_at)}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Description</div>
                <p className="mt-1 whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm text-slate-200">
                  {selected.description || "—"}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button variant="ghost" className="text-slate-400 hover:bg-white/5 hover:text-slate-200" onClick={() => setSelected(null)}>
                  <X className="mr-1.5 h-4 w-4" /> Close
                </Button>
                <Button
                  variant="ghost" disabled={busy || selected.status === "Rejected"}
                  onClick={() => updateStatus(selected.id, "Rejected")}
                  className="text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Resolve
                </Button>
                <Button
                  disabled={busy || selected.status === "Verified"}
                  onClick={() => updateStatus(selected.id, "Verified")}
                  className="bg-rose-500 text-white hover:bg-rose-400"
                >
                  <ShieldAlert className="mr-1.5 h-4 w-4" /> Issue Warning
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────── */

function CaptainFeedbackPage() {
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentAppUser, staleTime: 60_000 });
  const capsQ = useQuery({ queryKey: ["captains"], queryFn: loadCaptains });
  const reportsQ = useQuery({ queryKey: ["cf-reports"], queryFn: loadAllReports });

  useEffect(() => {
    const ch = supabase
      .channel("captain-feedback-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => {
        qc.invalidateQueries({ queryKey: ["cf-reports"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const role = meQ.data?.role;
  // "Teacher" surface is enabled for captains (staff proxy) since app has no teacher role.
  const isStaff = role === "captain";

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <PageLayout
        title="Anonymous Captain Feedback"
        description="Your identity will never be shared."
      >
        {meQ.isLoading || capsQ.isLoading || reportsQ.isLoading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : isStaff ? (
          <TeacherView reports={reportsQ.data ?? []} captains={capsQ.data ?? []} />
        ) : (
          <StudentView captains={capsQ.data ?? []} meId={meQ.data?.id ?? null} />
        )}
      </PageLayout>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/captain-feedback")({
  component: CaptainFeedbackPage,
});
