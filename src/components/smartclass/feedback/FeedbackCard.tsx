import { useMemo, useState } from "react";
import { ThumbsUp, ThumbsDown, Pencil, Trash2 } from "lucide-react";
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
    <article className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900">{feedback.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            {feedback.category && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                {feedback.category}
              </span>
            )}
            <span className="text-gray-400">{timeAgo(feedback.created_at)}</span>
            <span className="text-gray-400">
              · Posted by <span className="font-medium text-sky-700">@{authorHandle ?? "anonymous"}</span>
            </span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles(feedback.status)}`}
        >
          {feedback.status}
        </span>
      </header>

      {feedback.description && (
        <p className="mt-3 text-sm text-gray-600">{feedback.description}</p>
      )}
      {feedback.category === "Fund Issue" && feedback.amount != null && (
        <p className="mt-2 text-sm font-medium text-gray-700">
          Reported Amount: ৳ {Number(feedback.amount).toLocaleString()}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sky-700">{pct}% support</span>
          <span>{total} total votes</span>
        </div>
        <div className="mt-1 flex items-center gap-4">
          <span>👍 True: {yes}</span>
          <span>👎 False: {no}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-1 items-end justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handle(true)}
            disabled={isOwner || !!myVote || busy}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              myVote?.vote === true
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            }`}
          >
            <ThumbsUp size={14} /> True
          </button>
          <button
            type="button"
            onClick={() => handle(false)}
            disabled={isOwner || !!myVote || busy}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              myVote?.vote === false
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            }`}
          >
            <ThumbsDown size={14} /> False
          </button>
        </div>
        {canModify && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      {(isOwner || myVote) && (
        <p className="mt-2 text-xs text-gray-400">
          {isOwner ? "You cannot vote on your own feedback." : "You have already voted."}
        </p>
      )}
    </article>
  );
}