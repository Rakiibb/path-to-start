import { useMemo, useState } from "react";
import { ThumbsUp, ThumbsDown, Pencil, Trash2, CheckCircle2, Clock, XCircle, Users, Wallet } from "lucide-react";
import type { Feedback, FeedbackVote } from "@/services/types";
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
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "Rejected":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200";
  }
}

function StatusIcon({ status, className }: { status: string; className?: string }) {
  if (status === "Verified") return <CheckCircle2 className={className} />;
  if (status === "Rejected") return <XCircle className={className} />;
  return <Clock className={className} />;
}

const CATEGORY_COLORS: Record<string, string> = {
  Academic:            "bg-blue-50 text-blue-700 ring-blue-200",
  "Fund Issue":        "bg-amber-50 text-amber-800 ring-amber-200",
  Sports:              "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Seating:             "bg-purple-50 text-purple-700 ring-purple-200",
  "Class Management":  "bg-indigo-50 text-indigo-700 ring-indigo-200",
  Other:               "bg-slate-50 text-slate-700 ring-slate-200",
  General:             "bg-sky-50 text-sky-700 ring-sky-200",
};
function categoryStyles(c?: string | null): string {
  return CATEGORY_COLORS[c ?? "General"] ?? CATEGORY_COLORS.General;
}
export interface FeedbackCardProps {
  feedback: Feedback;
  votes: FeedbackVote[];
  currentUserId: string | null;
  authorHandle?: string | null;
  onVote: (vote: boolean) => Promise<void> | void;
  onEdit: () => void;
  onDelete: () => void;
}

export function FeedbackCard({
  feedback,
  votes,
  currentUserId,
  authorHandle,
  onVote,
  onEdit,
  onDelete,
}: FeedbackCardProps) {
  const [busy, setBusy] = useState(false);
  const isOwner = currentUserId === feedback.created_by;
  const myVote = votes.find((v) => v.user_id === currentUserId);
  const total = votes.length;
  const yes = votes.filter((v) => v.vote).length;
  const no = total - yes;
  const pct = total > 0 ? Math.round((yes / total) * 100) : 0;
  const canModify = isOwner && feedback.status === "Pending";

  const handle = useMemo(
    () => async (v: boolean) => {
      if (isOwner || myVote || busy) return;
      setBusy(true);
      try {
        await onVote(v);
      } finally {
        setBusy(false);
      }
    },
    [isOwner, myVote, busy, onVote],
  );

  return (
    <article className="group card-hover flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {feedback.category && (
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                categoryStyles(feedback.category),
              )}>
                {feedback.category}
              </span>
            )}
          </div>
          <h3 className="mt-2.5 line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-foreground">
            {feedback.title}
          </h3>
        </div>
        <span className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
          statusStyles(feedback.status),
        )}>
          <StatusIcon status={feedback.status} className="h-3 w-3" />
          {feedback.status}
        </span>
      </header>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {(authorHandle ?? "?")[0]?.toUpperCase()}
        </div>
        <span>@<span className="font-medium text-foreground">{authorHandle ?? "anonymous"}</span></span>
        <span className="text-border">•</span>
        <span>{timeAgo(feedback.created_at)}</span>
      </div>

      {feedback.description && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{feedback.description}</p>
      )}

      {feedback.category === "Fund Issue" && feedback.amount != null && (
        <div className="mt-3 inline-flex items-center gap-2 self-start rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
          <Wallet className="h-3.5 w-3.5" />
          ৳ {Number(feedback.amount).toLocaleString()}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">{pct}% support</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" /> {total} votes
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs font-medium">
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <ThumbsUp className="h-3 w-3" /> {yes} True
          </span>
          <span className="inline-flex items-center gap-1 text-red-700">
            <ThumbsDown className="h-3 w-3" /> {no} False
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-1 items-end justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handle(true)}
            disabled={isOwner || !!myVote || busy}
            className={cn(
              "btn-press inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold",
              myVote?.vote === true
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-border bg-card text-foreground hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <ThumbsUp size={14} /> True
          </button>
          <button
            type="button"
            onClick={() => handle(false)}
            disabled={isOwner || !!myVote || busy}
            className={cn(
              "btn-press inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold",
              myVote?.vote === false
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-border bg-card text-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <ThumbsDown size={14} /> False
          </button>
        </div>
        {canModify && (
          <div className="flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-card text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {(isOwner || myVote) && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {isOwner ? "You cannot vote on your own feedback." : "You have already voted."}
        </p>
      )}
    </article>
  );
}