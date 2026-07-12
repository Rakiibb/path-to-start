import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  ClipboardList,
  Star,
  Timer,
  Copy,
  Download,
  Trash2,
  Repeat,
} from "lucide-react";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { summarizeSyllabus, type SyllabusSummary } from "@/lib/ai-syllabus.functions";

export const Route = createFileRoute("/_authenticated/ai-syllabus")({
  component: AiSyllabusPage,
});

const MIN_CHARS = 100;
const MAX_CHARS = 20000;

function AiSyllabusPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<SyllabusSummary | null>(null);

  const len = text.length;
  const tooShort = len > 0 && len < MIN_CHARS;
  const tooLong = len > MAX_CHARS;

  const mutation = useMutation({
    mutationFn: async () => summarizeSyllabus({ data: { syllabus: text.trim() } }),
    onSuccess: (data) => {
      setResult(data);
      toast.success("Summary generated");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Unable to generate summary. Please try again.");
    },
  });

  const canGenerate = len >= MIN_CHARS && !tooLong && !mutation.isPending;

  const handleGenerate = () => {
    if (!text.trim()) {
      toast.error("Please paste a syllabus first.");
      return;
    }
    if (!canGenerate) return;
    mutation.mutate();
  };

  const summaryText = useMemo(() => {
    if (!result) return "";
    const lines: string[] = [];
    lines.push("SUMMARY");
    result.summary.forEach((s) => lines.push(`• ${s}`));
    lines.push("", "IMPORTANT TOPICS");
    result.importantTopics.forEach((s) => lines.push(`- ${s}`));
    lines.push("", `ESTIMATED STUDY TIME: ${result.estimatedStudyTime}`);
    if (result.repeatedTopics.length) {
      lines.push("", "REPEATED TOPICS");
      result.repeatedTopics.forEach((s) => lines.push(`- ${s}`));
    }
    return lines.join("\n");
  }, [result]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "syllabus-summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setText("");
    setResult(null);
  };

  return (
    <PageLayout
      title="AI Syllabus Summarizer"
      description="Paste a long syllabus and get a simple exam-focused summary."
    >
      {/* Input Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <label htmlFor="syllabus" className="text-sm font-medium text-foreground">
          Your Syllabus
        </label>
        <Textarea
          id="syllabus"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS + 1))}
          placeholder="Paste your complete syllabus here..."
          className="mt-2 min-h-[280px] resize-y rounded-xl text-sm leading-relaxed"
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span
            className={
              tooShort
                ? "text-amber-600"
                : tooLong
                ? "text-red-600"
                : "text-muted-foreground"
            }
          >
            {tooShort
              ? `Add at least ${MIN_CHARS - len} more characters`
              : tooLong
              ? `Over limit by ${len - MAX_CHARS}`
              : `Minimum ${MIN_CHARS} · Maximum ${MAX_CHARS.toLocaleString()}`}
          </span>
          <span className="font-mono text-muted-foreground">
            {len.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="rounded-xl"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Summary...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Summary
              </>
            )}
          </Button>
          {(text || result) && (
            <Button variant="outline" size="lg" onClick={handleClear} className="rounded-xl">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Output Card */}
      {result && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Your Summary
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="rounded-lg">
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy Summary
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="rounded-lg">
                <Download className="mr-2 h-3.5 w-3.5" />
                Download as TXT
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Section icon={<ClipboardList className="h-4 w-4" />} title="📋 Summary">
              <ul className="space-y-1.5 text-sm text-foreground">
                {result.summary.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section icon={<Star className="h-4 w-4" />} title="⭐ Important Topics">
              <div className="flex flex-wrap gap-1.5">
                {result.importantTopics.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Section>

            <Section icon={<Timer className="h-4 w-4" />} title="⏱ Estimated Study Time">
              <p className="text-2xl font-semibold text-foreground">
                {result.estimatedStudyTime}
              </p>
            </Section>

            {result.repeatedTopics.length > 0 && (
              <Section icon={<Repeat className="h-4 w-4" />} title="🔁 Repeated Topics">
                <ul className="space-y-1.5 text-sm text-foreground">
                  {result.repeatedTopics.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">-</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}