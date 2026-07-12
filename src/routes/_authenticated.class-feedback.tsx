import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { createFeedback, getMyLastFeedback } from "@/services/feedback.service";
import { getCurrentAppUser } from "@/lib/auth";

const CATEGORIES = [
  "Academic",
  "Fund Issue",
  "Sports",
  "Seating",
  "Class Management",
  "Other",
] as const;

const schema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(100, "Max 100 characters"),
    category: z.enum(["", ...CATEGORIES] as [string, ...string[]]),
    description: z
      .string()
      .trim()
      .min(20, "At least 20 characters")
      .max(1000, "Max 1000 characters"),
    amount: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.category === "Fund Issue") {
      const n = Number(val.amount);
      if (!val.amount || Number.isNaN(n) || n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: "Reported amount is required",
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function ClassFeedbackPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getCurrentAppUser,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (me && me.role === "captain") navigate({ to: "/captain-feedback", replace: true });
  }, [me, navigate]);
  const { data: lastFeedback, isLoading: loadingLast } = useQuery({
    queryKey: ["my-last-feedback"],
    queryFn: getMyLastFeedback,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", category: "", description: "", amount: "" },
  });

  const category = watch("category");
  const description = watch("description") ?? "";

  const within24h =
    lastFeedback &&
    Date.now() - new Date(lastFeedback.created_at).getTime() < 24 * 60 * 60 * 1000;

  const onSubmit = async (values: FormValues) => {
    try {
      await createFeedback({
        title: values.title,
        category: values.category || null,
        description: values.description,
        amount: values.category === "Fund Issue" ? Number(values.amount) : null,
        status: "Pending",
      });
      toast.success("Feedback submitted successfully.");
      reset();
      await qc.invalidateQueries({ queryKey: ["my-last-feedback"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit feedback";
      toast.error(msg);
    }
  };

  const fieldLabel = "block text-sm font-medium text-gray-700 mb-1.5";
  const fieldInput =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-gray-50";
  const fieldError = "mt-1 text-xs text-red-600";

  return (
    <PageLayout
      title="Class Feedback"
      description="Share classroom issues, suggestions or concerns anonymously."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {within24h && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                You have already submitted feedback within the last 24 hours.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className={fieldLabel} htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  maxLength={100}
                  placeholder="Short summary of your feedback"
                  className={fieldInput}
                  disabled={!!within24h}
                  {...register("title")}
                />
                {errors.title && <p className={fieldError}>{errors.title.message}</p>}
              </div>

              <div>
                <label className={fieldLabel} htmlFor="category">
                  Category
                </label>
                <select
                  id="category"
                  className={fieldInput}
                  disabled={!!within24h}
                  {...register("category")}
                >
                  <option value="">— None —</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {category === "Fund Issue" && (
                <div>
                  <label className={fieldLabel} htmlFor="amount">
                    Reported Amount (Tk) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="amount"
                    type="number"
                    min={0}
                    step="1"
                    inputMode="numeric"
                    placeholder="0"
                    className={fieldInput}
                    disabled={!!within24h}
                    {...register("amount")}
                  />
                  {errors.amount && <p className={fieldError}>{errors.amount.message}</p>}
                </div>
              )}

              <div>
                <label className={fieldLabel} htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  rows={5}
                  maxLength={1000}
                  placeholder="Describe your feedback in detail (min 20 characters)"
                  className={fieldInput}
                  disabled={!!within24h}
                  {...register("description")}
                />
                <div className="mt-1 flex items-center justify-between">
                  {errors.description ? (
                    <p className={fieldError}>{errors.description.message}</p>
                  ) : (
                    <span className="text-xs text-gray-400">
                      Anonymous — your identity is never shown.
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{description.length}/1000</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !!within24h}
                  className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSubmitting ? "Submitting…" : "Submit Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <aside>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">My Recent Submission</h2>
            <div className="mt-3">
              {loadingLast ? (
                <div className="h-16 animate-pulse rounded bg-gray-100" />
              ) : !lastFeedback ? (
                <p className="text-sm text-gray-500">No recent submission.</p>
              ) : (
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {lastFeedback.title}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span
                      className={`rounded-full border px-2 py-0.5 font-medium ${
                        lastFeedback.status === "Verified"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : lastFeedback.status === "Rejected"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {lastFeedback.status}
                    </span>
                    <span className="text-gray-500">{timeAgo(lastFeedback.created_at)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute("/_authenticated/class-feedback")({
  component: ClassFeedbackPage,
});
