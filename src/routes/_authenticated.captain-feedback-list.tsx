import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { getCurrentAppUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldAlert, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "Pending" | "Verified" | "Rejected";
type Row = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: Status;
  created_at: string;
  target_captain_id: string | null;
  target_captain: { full_name: string } | null;
};

async function loadAll(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("id, title, description, category, status, created_at, target_captain_id, target_captain:users!feedback_target_captain_id_fkey(full_name)")
    .eq("feedback_type", "Captain")
    .not("target_captain_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

const STATUS_STYLES: Record<Status, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-gray-100 text-gray-600 border-gray-200",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function CaptainFeedbackListPage() {
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentAppUser, staleTime: 60_000 });
  const rowsQ = useQuery({ queryKey: ["captain-feedback-list"], queryFn: loadAll });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Status>("All");

  useEffect(() => {
    const ch = supabase
      .channel("captain-feedback-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => {
        qc.invalidateQueries({ queryKey: ["captain-feedback-list"] });
        qc.invalidateQueries({ queryKey: ["captain-feedback"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const isCaptain = meQ.data?.role === "captain";

  const visible = useMemo(() => {
    const rows = rowsQ.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.target_captain?.full_name ?? "").toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [rowsQ.data, search, statusFilter]);

  async function setStatus(id: string, status: Status) {
    const { error } = await supabase.from("feedback").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked as ${status}`);
    qc.invalidateQueries({ queryKey: ["captain-feedback-list"] });
    qc.invalidateQueries({ queryKey: ["captain-feedback"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this feedback?")) return;
    const { error } = await supabase.from("feedback").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["captain-feedback-list"] });
  }

  const filters: Array<"All" | Status> = ["All", "Pending", "Verified", "Rejected"];

  return (
    <PageLayout
      title="All Captain Feedback"
      description="Every feedback submitted about classroom captains."
    >
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by captain, title, category…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                statusFilter === f
                  ? "border-sky-600 bg-sky-50 text-sky-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      <section>
        {rowsQ.isLoading ? (
          <div className="text-sm text-gray-500">Loading feedback…</div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-gray-400" />
            No captain feedback found.
          </div>
        ) : (
          <div className="grid gap-3">
            {visible.map((r) => (
              <article key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-gray-900">{r.title}</h3>
                      <Badge variant="outline" className={cn("text-[11px]", STATUS_STYLES[r.status])}>
                        {r.status}
                      </Badge>
                      {r.category && (
                        <Badge variant="outline" className="text-[11px] text-gray-600">
                          {r.category}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      About <span className="font-medium text-gray-700">{r.target_captain?.full_name ?? "—"}</span>
                      <span className="mx-1.5">·</span>
                      <Clock className="mr-1 inline h-3 w-3" />
                      {fmtDate(r.created_at)}
                    </div>
                    {r.description && (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{r.description}</p>
                    )}
                  </div>
                  {isCaptain && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {r.status !== "Verified" && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "Verified")}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Verify
                        </Button>
                      )}
                      {r.status !== "Rejected" && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "Rejected")}>
                          <X className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => remove(r.id)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageLayout>
  );
}

export const Route = createFileRoute("/_authenticated/captain-feedback-list")({
  component: CaptainFeedbackListPage,
});