import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Search, AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Coins } from "lucide-react";

const TIFFIN_TAX_RATE = 2; // taka per Tiffin Tax complaint

const CATEGORIES = ["Academic", "Behavior", "Leadership", "Fund Issue", "Communication", "Tiffin Tax", "Other"] as const;

const schema = z.object({
  target_captain_id: z.string().uuid("Select a captain"),
  title: z.string().trim().min(1, "Title is required").max(120, "Max 120"),
  description: z.string().trim().min(20, "At least 20 characters").max(1000, "Max 1000"),
  category: z.enum(["", ...CATEGORIES] as [string, ...string[]]).optional(),
});
type FormValues = z.infer<typeof schema>;

type Captain = { id: string; full_name: string };
type CapFeedback = {
  id: string;
  target_captain_id: string;
  status: "Pending" | "Verified" | "Rejected";
  created_at: string;
};

type CapFeedbackDetail = CapFeedback & {
  title: string;
  description: string | null;
  category: string | null;
};

type Tier = "Safe" | "Warning" | "High Risk" | "Red Alert";
type Stats = {
  captain: Captain;
  total: number;
  verified: number;
  pending: number;
  latestVerifiedAt: string | null;
  tier: Tier;
};

const TIER_STYLES: Record<
  Tier,
  { border: string; badge: string; dot: string; label: string; ring: string; track: string }
> = {
  Safe:        { border: "border-emerald-200",  badge: "bg-emerald-50 text-emerald-700 border border-emerald-100",  dot: "bg-emerald-500", label: "Safe",       ring: "stroke-emerald-500", track: "stroke-emerald-100" },
  Warning:     { border: "border-yellow-200",   badge: "bg-yellow-50 text-yellow-800 border border-yellow-100",    dot: "bg-yellow-500",  label: "Warning",    ring: "stroke-yellow-500",  track: "stroke-yellow-100" },
  "High Risk": { border: "border-orange-200",   badge: "bg-orange-50 text-orange-800 border border-orange-100",    dot: "bg-orange-500",  label: "High Risk",  ring: "stroke-orange-500",  track: "stroke-orange-100" },
  "Red Alert": { border: "border-red-400",      badge: "bg-red-600 text-white",                                    dot: "bg-red-600",     label: "RED ALERT",  ring: "stroke-red-500",     track: "stroke-red-100" },
};

function tierFor(verified: number): Tier {
  if (verified >= 3) return "Red Alert";
  if (verified === 2) return "High Risk";
  if (verified === 1) return "Warning";
  return "Safe";
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

async function loadCaptains(): Promise<Captain[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "captain")
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

async function loadCaptainFeedback(): Promise<CapFeedback[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("id, target_captain_id, status, created_at")
    .eq("feedback_type", "Captain")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((r) => r.target_captain_id) as CapFeedback[];
}

function ProgressRing({ value, tier }: { value: number; tier: Tier }) {
  const t = TIER_STYLES[tier];
  const pct = Math.min(1, value / 3);
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0 -rotate-90">
      <circle cx="28" cy="28" r={r} strokeWidth="6" fill="none" className={t.track} />
      <circle
        cx="28" cy="28" r={r} strokeWidth="6" fill="none" strokeLinecap="round"
        className={cn(t.ring, "transition-[stroke-dashoffset] duration-500")}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
      />
      <text x="28" y="32" textAnchor="middle" transform="rotate(90 28 28)"
        className="fill-foreground text-[13px] font-semibold">
        {value}/3
      </text>
    </svg>
  );
}

function CaptainCard({ s, onClick }: { s: Stats; onClick: () => void }) {
  const t = TIER_STYLES[s.tier];
  const isRed = s.tier === "Red Alert";
  const progress = Math.min(3, s.verified);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left rounded-2xl border bg-card p-6 shadow-soft card-hover cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        t.border,
        isRed && "animate-red-alert glow-red",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
          {initials(s.captain.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-foreground">{s.captain.full_name}</div>
          <span className={cn("mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", t.badge)}>
            {isRed && <AlertTriangle className="h-3 w-3" />}
            {!isRed && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />}
            {t.label}
          </span>
        </div>
        <ProgressRing value={progress} tier={s.tier} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <Stat label="Total" value={s.total} />
        <Stat label="Verified" value={s.verified} tone={isRed ? "text-red-600" : "text-foreground"} />
        <Stat label="Pending" value={s.pending} tone="text-amber-600" />
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Verified progress</span>
          <span className="font-mono">{progress} / 3</span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < progress ? (isRed ? "bg-red-500" : "bg-primary") : "bg-muted",
            )} />
          ))}
        </div>
      </div>
      {isRed && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-lift">
          <AlertTriangle className="h-4 w-4" /> RED ALERT
        </div>
      )}
    </button>
  );
}

function Stat({ label, value, tone = "text-gray-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 py-2">
      <div className={cn("text-lg font-semibold", tone)}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}

function CaptainFeedbackPage() {
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentAppUser, staleTime: 60_000 });
  const capsQ = useQuery({ queryKey: ["captains"], queryFn: loadCaptains });
  const fbQ = useQuery({ queryKey: ["captain-feedback"], queryFn: loadCaptainFeedback });

  const allFbQ = useQuery({
    queryKey: ["captain-feedback-all"],
    queryFn: async (): Promise<(CapFeedbackDetail & { captain: Captain | null })[]> => {
      const { data, error } = await supabase
        .from("feedback")
        .select("id, target_captain_id, status, created_at, title, description, category, captain:users!feedback_target_captain_id_fkey(id, full_name)")
        .eq("feedback_type", "Captain")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, captain: r.captain ?? null }));
    },
  });
  const [allSearch, setAllSearch] = useState("");

  const corruption = useMemo(() => {
    const rows = (allFbQ.data ?? []).filter((r) => r.category === "Tiffin Tax");
    const totalTk = rows.length * TIFFIN_TAX_RATE;
    const byDay: Record<string, number> = {};
    rows.forEach((r) => {
      const d = new Date(r.created_at);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      byDay[key] = (byDay[key] ?? 0) + TIFFIN_TAX_RATE;
    });
    const daily = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, tk]) => ({
        date,
        label: new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
        tk,
      }));
    return { totalTk, count: rows.length, daily };
  }, [allFbQ.data]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | Tier>("All");
  const [selectedCaptain, setSelectedCaptain] = useState<Captain | null>(null);

  const detailQ = useQuery({
    queryKey: ["captain-feedback-detail", selectedCaptain?.id],
    enabled: !!selectedCaptain,
    queryFn: async (): Promise<CapFeedbackDetail[]> => {
      const { data, error } = await supabase
        .from("feedback")
        .select("id, target_captain_id, status, created_at, title, description, category")
        .eq("feedback_type", "Captain")
        .eq("target_captain_id", selectedCaptain!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CapFeedbackDetail[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("captain-feedback")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => {
        qc.invalidateQueries({ queryKey: ["captain-feedback"] });
        qc.invalidateQueries({ queryKey: ["captain-feedback-all"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const stats: Stats[] = useMemo(() => {
    const caps = capsQ.data ?? [];
    const rows = fbQ.data ?? [];
    return caps.map((c) => {
      const mine = rows.filter((r) => r.target_captain_id === c.id);
      const verified = mine.filter((r) => r.status === "Verified");
      const pending  = mine.filter((r) => r.status === "Pending");
      return {
        captain: c,
        total: mine.length,
        verified: verified.length,
        pending: pending.length,
        latestVerifiedAt: verified[0]?.created_at ?? null,
        tier: tierFor(verified.length),
      };
    });
  }, [capsQ.data, fbQ.data]);

  const visible = useMemo(() => {
    return stats
      .filter((s) => (filter === "All" ? true : s.tier === filter))
      .filter((s) => s.captain.full_name.toLowerCase().includes(search.trim().toLowerCase()));
  }, [stats, filter, search]);

  const redAlerts = useMemo(
    () => stats.filter((s) => s.tier === "Red Alert").sort((a, b) => b.verified - a.verified),
    [stats],
  );

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { target_captain_id: "", title: "", description: "", category: "" },
  });
  const description = watch("description") ?? "";

  const onSubmit = async (v: FormValues) => {
    if (!meQ.data) { toast.error("Not signed in"); return; }
    if (v.target_captain_id === meQ.data.id) {
      toast.error("You cannot submit feedback about yourself");
      return;
    }
    const { error } = await supabase.from("feedback").insert({
      created_by: meQ.data.id,
      target_captain_id: v.target_captain_id,
      title: v.title,
      description: v.description,
      category: v.category || null,
      status: "Pending",
      feedback_type: "Captain",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Captain feedback submitted");
    reset();
  };

  const filters: Array<"All" | Tier> = ["All", "Safe", "Warning", "High Risk", "Red Alert"];

  return (
    <PageLayout
      title="Captain Feedback"
      description="Submit anonymous feedback about classroom captains to improve classroom management."
    >
      {/* Red alert board */}
      <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h2 className="text-base font-semibold text-gray-900">Captain Alert Board</h2>
          <span className="ml-auto text-xs text-gray-500">{redAlerts.length} on RED ALERT</span>
        </div>
        {redAlerts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            <ShieldCheck className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
            No captains on red alert.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2">Captain</th>
                  <th className="px-4 py-2">Verified</th>
                  <th className="px-4 py-2">Latest Complaint</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {redAlerts.map((s) => (
                  <tr key={s.captain.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{s.captain.full_name}</td>
                    <td className="px-4 py-2 text-red-600 font-semibold">{s.verified}</td>
                    <td className="px-4 py-2 text-gray-600">{s.latestVerifiedAt ? fmtDate(s.latestVerifiedAt) : "—"}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">RED ALERT</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Filters + search */}
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search captains by name"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                filter === f
                  ? "border-sky-600 bg-sky-50 text-sky-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Captain cards */}
      <section>
        {fbQ.isLoading || capsQ.isLoading ? (
          <div className="text-sm text-gray-500">Loading captains…</div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No captains match your filter.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((s) => (
              <CaptainCard
                key={s.captain.id}
                s={s}
                onClick={() => setSelectedCaptain(s.captain)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Submit form */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Submit Captain Feedback</h2>
        <p className="mt-1 text-xs text-gray-500">
          Anonymous. One submission per 24 hours. You cannot submit feedback about yourself.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-1">
            <Label>Captain *</Label>
            <select
              className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              {...register("target_captain_id")}
            >
              <option value="">Select a captain</option>
              {(capsQ.data ?? [])
                .filter((c) => c.id !== meQ.data?.id)
                .map((c) => (<option key={c.id} value={c.id}>{c.full_name}</option>))}
            </select>
            {errors.target_captain_id && <p className="mt-1 text-xs text-red-600">{errors.target_captain_id.message}</p>}
          </div>
          <div>
            <Label>Category</Label>
            <select
              className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              {...register("category")}
              onChange={(e) => setValue("category", e.target.value as FormValues["category"])}
            >
              <option value="">—</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Title *</Label>
            <Input className="mt-1.5" {...register("title")} placeholder="Short summary" />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div className="md:col-span-2">
            <Label>Description *</Label>
            <Textarea className="mt-1.5" rows={4} {...register("description")} placeholder="Explain the situation clearly (min 20 characters)…" />
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{errors.description?.message ?? " "}</span>
              <span>{description.length} / 1000</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit Feedback"}
            </Button>
          </div>
        </form>
      </section>

      {/* All feedback */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">All Feedback</h2>
            <p className="mt-1 text-xs text-gray-500">
              Every captain feedback ever submitted, newest first.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search title or description"
              className="pl-9"
              value={allSearch}
              onChange={(e) => setAllSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {allFbQ.isLoading ? (
            <div className="py-6 text-center text-sm text-gray-500">Loading feedback…</div>
          ) : (() => {
            const q = allSearch.trim().toLowerCase();
            const rows = (allFbQ.data ?? []).filter((r) =>
              !q ||
              (r.title ?? "").toLowerCase().includes(q) ||
              (r.description ?? "").toLowerCase().includes(q),
            );
            if (rows.length === 0) {
              return <div className="py-6 text-center text-sm text-gray-500">No feedback found.</div>;
            }
            return rows.map((r) => (
              <article key={r.id} className="rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>About <span className="font-medium text-gray-700">{r.captain?.full_name ?? "Unknown"}</span></span>
                  {r.category && (
                    <Badge variant="outline" className="text-[11px] text-gray-600">{r.category}</Badge>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(r.created_at).toLocaleString(undefined, {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                {r.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{r.description}</p>
                )}
              </article>
            ));
          })()}
        </div>
      </section>

      <Dialog open={!!selectedCaptain} onOpenChange={(o) => !o && setSelectedCaptain(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Feedback about {selectedCaptain?.full_name}
            </DialogTitle>
          </DialogHeader>
          {detailQ.isLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : !detailQ.data || detailQ.data.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No feedback submitted about this captain yet.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">
                Total {detailQ.data.length} feedback{detailQ.data.length === 1 ? "" : "s"}
              </div>
              {detailQ.data.map((r) => (
                <article key={r.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px]",
                        r.status === "Verified" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        r.status === "Pending" && "bg-amber-50 text-amber-700 border-amber-200",
                        r.status === "Rejected" && "bg-gray-100 text-gray-600 border-gray-200",
                      )}
                    >
                      {r.status}
                    </Badge>
                    {r.category && (
                      <Badge variant="outline" className="text-[11px] text-gray-600">
                        {r.category}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {new Date(r.created_at).toLocaleString(undefined, {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                  {r.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{r.description}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

export const Route = createFileRoute("/_authenticated/captain-feedback")({
  component: CaptainFeedbackPage,
});
