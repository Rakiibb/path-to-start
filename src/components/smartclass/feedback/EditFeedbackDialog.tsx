import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Feedback } from "@/services/types";
import { updateFeedback } from "@/services/feedback.service";

const CATEGORIES = [
  "Academic",
  "Fund Issue",
  "Sports",
  "Seating",
  "Class Management",
  "Other",
  "General",
] as const;

export function EditFeedbackDialog({
  feedback,
  onClose,
  onSaved,
}: {
  feedback: Feedback | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (feedback) {
      setTitle(feedback.title);
      setCategory(feedback.category ?? "");
      setDescription(feedback.description ?? "");
      setAmount(feedback.amount != null ? String(feedback.amount) : "");
      setError("");
    }
  }, [feedback]);

  if (!feedback) return null;

  const input =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

  async function onSave() {
    setError("");
    if (!title.trim()) return setError("Title is required.");
    if (title.length > 100) return setError("Title must be 100 characters or less.");
    if (description.trim().length < 20) return setError("Description must be at least 20 characters.");
    if (description.length > 1000) return setError("Description must be 1000 characters or less.");
    const amt = category === "Fund Issue" ? Number(amount) : null;
    if (category === "Fund Issue" && (!amount || Number.isNaN(amt!) || amt! <= 0)) {
      return setError("Reported Amount is required.");
    }
    setSaving(true);
    try {
      await updateFeedback(feedback!.id, {
        title: title.trim(),
        category: category || null,
        description: description.trim(),
        amount: amt,
      });
      toast.success("Feedback updated.");
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900">Edit Feedback</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
            <input maxLength={100} className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
            <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">— None —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {category === "Fund Issue" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Reported Amount (Tk)</label>
              <input type="number" min={0} className={input} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea rows={5} maxLength={1000} className={input} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:bg-gray-300"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}