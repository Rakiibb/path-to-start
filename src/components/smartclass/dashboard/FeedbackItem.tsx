import type { Feedback, FeedbackVote } from "@/services/types";

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
    </div>
  );
}