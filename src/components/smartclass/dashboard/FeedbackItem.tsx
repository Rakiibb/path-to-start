import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Feedback, FeedbackVote } from "@/services/types";
import { castVote } from "@/services/votes.service";
import { getCurrentAppUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function statusStyles(status: string): string {
  switch (status) {
    case "Verified":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Rejected":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

export function FeedbackItem({
  feedback,
  votes,
}: {
  feedback: Feedback;
  votes: FeedbackVote[];
}) {
  const total = votes.length;
  const yes = votes.filter((v) => v.vote).length;
  const pct = total > 0 ? Math.round((yes / total) * 100) : 0;

  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentAppUser, staleTime: 60_000 });
  const meId = meQ.data?.id ?? null;
  const isAuthor = meId != null && meId === feedback.created_by;
  const myVote = meId ? votes.find((v) => v.user_id === meId)?.vote ?? null : null;
  const votingClosed = feedback.status !== "Pending";

  const voteMut = useMutation({
    mutationFn: (vote: boolean) => castVote(feedback.id, vote),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed to vote"),
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{feedback.title}</h3>
          {feedback.category && (
            <p className="mt-0.5 text-xs text-muted-foreground">{feedback.category}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles(
            feedback.status,
          )}`}
        >
          {feedback.status}
        </span>
      </div>
      {feedback.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{feedback.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="font-medium text-primary">{pct}% support</span>
          <span>· {total} votes</span>
        </div>
        <span>{timeAgo(feedback.created_at)}</span>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          disabled={isAuthor || votingClosed || voteMut.isPending}
          onClick={() => voteMut.mutate(true)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
            myVote === true
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
              : "border-border bg-card text-foreground hover:border-emerald-500/40 hover:text-emerald-700",
          )}
        >
          {voteMut.isPending && voteMut.variables === true ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ThumbsUp className="h-3.5 w-3.5" />
          )}
          Yes
        </button>
        <button
          type="button"
          disabled={isAuthor || votingClosed || voteMut.isPending}
          onClick={() => voteMut.mutate(false)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
            myVote === false
              ? "border-rose-500/40 bg-rose-500/10 text-rose-700"
              : "border-border bg-card text-foreground hover:border-rose-500/40 hover:text-rose-700",
          )}
        >
          {voteMut.isPending && voteMut.variables === false ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ThumbsDown className="h-3.5 w-3.5" />
          )}
          No
        </button>
        {votingClosed ? (
          <span className="ml-auto text-[11px] text-muted-foreground">Voting closed · {feedback.status}</span>
        ) : isAuthor && (
          <span className="ml-auto text-[11px] text-muted-foreground">You submitted this</span>
        )}
      </div>
    </div>
  );
}