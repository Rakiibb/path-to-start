import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { FeedbackCard } from "@/components/smartclass/feedback/FeedbackCard";
import { EditFeedbackDialog } from "@/components/smartclass/feedback/EditFeedbackDialog";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/services/users.service";
import { deleteFeedback, listAllFeedback } from "@/services/feedback.service";
import { castVote } from "@/services/votes.service";
import type { Feedback, FeedbackVote } from "@/services/types";

const CATEGORIES = [
  "All",
  "Academic",
  "Fund Issue",
  "Sports",
  "Seating",
  "Class Management",
  "Other",
  "General",
] as const;
const STATUSES = ["All", "Pending", "Verified", "Rejected"] as const;
const PAGE_SIZE = 10;

async function fetchAllVotes(): Promise<FeedbackVote[]> {
  const { data, error } = await supabase.from("feedback_votes").select("*");
  if (error) throw error;
  return data ?? [];
}

function FeedbackPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");
  const [mineOnly, setMineOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Feedback | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Feedback | null>(null);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });
  const feedbackQuery = useQuery({ queryKey: ["feedback-all"], queryFn: listAllFeedback });
  const votesQuery = useQuery({ queryKey: ["votes-all"], queryFn: fetchAllVotes });

  // Realtime subscription.
  useEffect(() => {
    const channel = supabase
      .channel("feedback-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => {
        qc.invalidateQueries({ queryKey: ["feedback-all"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback_votes" }, () => {
        qc.invalidateQueries({ queryKey: ["votes-all"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const me = meQuery.data ?? null;
  const feedback = feedbackQuery.data ?? [];
  const votes = votesQuery.data ?? [];
  const isLoading = feedbackQuery.isLoading || votesQuery.isLoading;

  const votesByFeedback = useMemo(() => {
    const map = new Map<string, FeedbackVote[]>();
    for (const v of votes) {
      const list = map.get(v.feedback_id) ?? [];
      list.push(v);
      map.set(v.feedback_id, list);
    }
    return map;
  }, [votes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return feedback.filter((f) => {
      if (mineOnly && me && f.created_by !== me.id) return false;
      if (category !== "All" && f.category !== category) return false;
      if (status !== "All" && f.status !== status) return false;
      if (q) {
        const hay = `${f.title} ${f.description ?? ""} ${f.category ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [feedback, mineOnly, me, category, status, search]);

  useEffect(() => { setPage(1); }, [search, category, status, mineOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleVote(f: Feedback, vote: boolean) {
    try {
      await castVote(f.id, vote);
      qc.invalidateQueries({ queryKey: ["votes-all"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vote failed");
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteFeedback(confirmDelete.id);
      toast.success("Feedback deleted.");
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["feedback-all"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const input =
    "h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

  return (
    <PageLayout title="Feedback" description="Browse all classroom feedback submitted by students.">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search feedback…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${input} w-full pl-9`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className={input} value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
              <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} className="h-4 w-4 accent-sky-600" />
              My Feedback
            </label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">
          No feedback found.
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {pageItems.map((f) => (
              <FeedbackCard
                key={f.id}
                feedback={f}
                votes={votesByFeedback.get(f.id) ?? []}
                currentUserId={me?.id ?? null}
                onVote={(v) => handleVote(f, v)}
                onEdit={() => setEditing(f)}
                onDelete={() => setConfirmDelete(f)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <p className="text-gray-500">
                Page {currentPage} of {totalPages} · {filtered.length} results
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <EditFeedbackDialog
        feedback={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["feedback-all"] });
        }}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900">Delete feedback?</h2>
            <p className="mt-2 text-sm text-gray-600">
              This action cannot be undone. "{confirmDelete.title}" will be permanently removed.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export const Route = createFileRoute("/_authenticated/feedback")({
  component: FeedbackPage,
});
