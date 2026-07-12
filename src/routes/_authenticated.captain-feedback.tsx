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
import { Search, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Academic", "Behavior", "Leadership", "Fund Issue", "Communication", "Other"] as const;

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

type Tier = "Safe" | "Warning" | "High Risk" | "Red Alert";
type Stats = {
  captain: Captain;
  total: number;
  verified: number;
  pending: number;
  latestVerifiedAt: string | null;
  tier: Tier;
};

const TIER_STYLES: Record<Tier, { border: string; ring: string; badge: string; dot: string; label: string }> = {
  Safe:        { border: "border-emerald-300", ring: "", badge: "bg-emerald-100 text-emerald-700",  dot: "bg-emerald-500", label: "🟢 Safe" },
  Warning:     { border: "border-yellow-300",  ring: "", badge: "bg-yellow-100 text-yellow-800",   dot: "bg-yellow-500",  label: "🟡 Warning" },
  "High Risk": { border: "border-orange-300",  ring: "", badge: "bg-orange-100 text-orange-800",   dot: "bg-orange-500",  label: "🟠 High Risk" },
  "Red Alert": { border: "border-red-400", ring: "shadow-[0_0_0_4px_rgba(248,113,113,0.25)]", badge: "bg-red-600 text-white", dot: "bg-red-600", label: "🔴 RED ALERT" },
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

function CaptainCard({ s }: { s: Stats }) {
  const t = TIER_STYLES[s.tier];
  const progress = Math.min(3, s.verified);
  return (
    <div className={cn("rounded-2xl border-2 bg-white p-5 shadow-sm transition", t.border, t.ring)}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-semibold">
          {initials(s.captain.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">{s.captain.full_name}</div>
          <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", t.badge)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} /> {t.label}
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Total" value={s.total} />
        <Stat label="Verified" value={s.verified} tone="text-red-600" />
        <Stat label="Pending" value={s.pending} tone="text-amber-600" />
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>Verified progress</span>
          <span className="font-mono">{progress} / 3</span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("h-2 flex-1 rounded", i < progress ? (s.tier === "Red Alert" ? "bg-red-500" : "bg-sky-500") : "bg-gray-200")} />
          ))}
        </div>
      </div>
      {s.tier === "Red Alert" && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">
          <AlertTriangle className="h-4 w-4" /> RED ALERT
        </div>
      )}
    </div>
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

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | Tier>("All");

  useEffect(() => {
    const ch = supabase
      .channel("captain-feedback")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => {
        qc.invalidateQueries({ queryKey: ["captain-feedback"] });
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
            {visible.map((s) => <CaptainCard key={s.captain.id} s={s} />)}
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
    </PageLayout>
  );
}

export const Route = createFileRoute("/_authenticated/captain-feedback")({
  component: CaptainFeedbackPage,
});
