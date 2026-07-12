import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { getCurrentAppUser } from "@/lib/auth";
import { listSeatRoster, type SeatRosterEntry } from "@/services/seat.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, FileDown, RotateCcw, Sparkles } from "lucide-react";
import { exportPdf, formatDate } from "@/lib/export";
import { Users, Armchair, CircleSlash, Ruler, Presentation, Settings2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seat-planner")({
  component: SeatPlannerPage,
});

type Filter = "all" | "student" | "captain";

function SeatPlannerPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getCurrentAppUser });
  const isCaptain = me?.role === "captain";

  const { data: roster = [], isLoading } = useQuery({
    queryKey: ["seat-roster"],
    queryFn: listSeatRoster,
  });

  // Realtime — auto refresh on height/role/user changes.
  useEffect(() => {
    const channel = supabase
      .channel("seat-roster")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => qc.invalidateQueries({ queryKey: ["seat-roster"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Control panel state.
  const [rowsInput, setRowsInput] = useState(5);
  const [colsInput, setColsInput] = useState(6);
  const [layout, setLayout] = useState<{ rows: number; cols: number }>({
    rows: 5,
    cols: 6,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("student");

  const filtered = useMemo(() => {
    return roster.filter((u) => (filter === "all" ? true : u.role === filter));
  }, [roster, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ah = a.height_cm ?? Number.POSITIVE_INFINITY;
      const bh = b.height_cm ?? Number.POSITIVE_INFINITY;
      return ah - bh;
    });
  }, [filtered]);

  const totalSeats = layout.rows * layout.cols;
  const seats: (SeatRosterEntry | null)[] = useMemo(() => {
    const arr: (SeatRosterEntry | null)[] = Array.from({ length: totalSeats }, () => null);
    sorted.slice(0, totalSeats).forEach((s, i) => (arr[i] = s));
    return arr;
  }, [sorted, totalSeats]);

  const emptySeats = Math.max(0, totalSeats - sorted.length);
  const avgHeight = useMemo(() => {
    const withH = sorted.filter((s) => s.height_cm != null);
    if (!withH.length) return 0;
    return Math.round(withH.reduce((sum, s) => sum + (s.height_cm ?? 0), 0) / withH.length);
  }, [sorted]);

  const coordFor = (i: number) => {
    const row = Math.floor(i / layout.cols);
    const col = (i % layout.cols) + 1;
    const letter = String.fromCharCode(65 + row);
    return `${letter}${col}`;
  };

  const q = search.trim().toLowerCase();
  const isMatch = (s: SeatRosterEntry | null) => {
    if (!s || !q) return false;
    return (
      (s.roll_number ?? "").toLowerCase().includes(q) ||
      (s.secret_code ?? "").toLowerCase().includes(q)
    );
  };

  const handleGenerate = () => {
    const r = Math.max(1, Math.min(20, Math.floor(rowsInput)));
    const c = Math.max(1, Math.min(20, Math.floor(colsInput)));
    setLayout({ rows: r, cols: c });
  };

  const handleReset = () => {
    setRowsInput(5);
    setColsInput(6);
    setLayout({ rows: 5, cols: 6 });
    setSearch("");
    setFilter("student");
  };

  const handlePrint = () => window.print();

  const handleExportPdf = () => {
    const rows = seats.map((s, i) => [
      String(i + 1).padStart(2, "0"),
      s?.roll_number ?? "—",
      s?.full_name ?? "Empty Seat",
      s?.secret_code ? `@${s.secret_code}` : "—",
      s?.height_cm ? `${s.height_cm} cm` : "—",
      s?.role ?? "—",
    ]);
    exportPdf({
      filename: "seat-plan",
      title: "Seat Planner",
      subtitle: `Layout: ${layout.rows} rows × ${layout.cols} cols · ${sorted.length} student(s) · ${formatDate(new Date())}`,
      orientation: "landscape",
      sections: [
        {
          heading: "Seating Arrangement (front → back, sorted by height)",
          columns: ["Seat", "Roll No.", "Full Name", "Secret Code", "Height", "Role"],
          rows,
        },
      ],
    });
  };

  return (
    <PageLayout
      title="Seat Planner"
      description="Automatically arrange students by height from front to back."
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 print:hidden">
        <StatTile icon={Users} label="Total Students" value={sorted.length} tint="sky" />
        <StatTile icon={Armchair} label="Total Seats" value={totalSeats} tint="indigo" />
        <StatTile icon={CircleSlash} label="Empty Seats" value={emptySeats} tint="amber" />
        <StatTile icon={Ruler} label="Average Height" value={avgHeight ? `${avgHeight} cm` : "—"} tint="emerald" />
      </div>

      {/* Control panel */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft print:hidden">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Settings2 size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Classroom Settings</h2>
            <p className="text-xs text-muted-foreground">Configure layout and filter the roster.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Rows</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={rowsInput}
              onChange={(e) => setRowsInput(Number(e.target.value))}
              className="w-24"
              disabled={!isCaptain}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Columns</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={colsInput}
              onChange={(e) => setColsInput(Number(e.target.value))}
              className="w-24"
              disabled={!isCaptain}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Filter</Label>
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="captain">Captains</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label className="text-xs font-medium text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Roll number or @secretcode"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {isCaptain && (
              <>
                <Button onClick={handleGenerate}>
                  <Sparkles className="mr-2 h-4 w-4" /> Generate Seating Plan
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset Layout
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={handleExportPdf}>
              <FileDown className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Classroom */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft print:border-0 print:shadow-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div className="text-sm text-muted-foreground">
            {sorted.length} student{sorted.length === 1 ? "" : "s"} · {layout.rows} × {layout.cols} = {totalSeats} seats
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Short
            <span className="ml-2 h-2 w-2 rounded-full bg-sky-500" /> Medium
            <span className="ml-2 h-2 w-2 rounded-full bg-indigo-500" /> Tall
            <span className="ml-2 h-2 w-2 rounded-full bg-slate-300" /> Empty
          </div>
        </div>

        {/* Teacher / Smart Board */}
        <div className="mb-8 print:mb-4">
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 to-primary/5 py-5 text-primary shadow-soft">
            <Presentation size={18} />
            <span className="text-sm font-semibold tracking-wide uppercase">Teacher / Smart Board</span>
          </div>
          <div className="mx-auto mt-1 h-1 max-w-3xl rounded-full bg-primary/20" />
          <p className="mt-3 text-center text-[11px] uppercase tracking-widest text-muted-foreground">Front of the Class</p>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No student data available.
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: layout.rows }).map((_, rowIdx) => (
              <div
                key={rowIdx}
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: layout.cols }).map((_, colIdx) => {
                  const i = rowIdx * layout.cols + colIdx;
                  const s = seats[i];
                  return (
                    <SeatCard key={i} coord={coordFor(i)} student={s} highlight={isMatch(s)} />
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 hidden print:flex items-center justify-center">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Back of the Class</div>
        </div>
      </div>
    </PageLayout>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  tint: "sky" | "indigo" | "amber" | "emerald";
}) {
  const tints: Record<string, string> = {
    sky: "bg-sky-50 text-sky-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft card-hover">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tints[tint]}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function heightAccent(h: number | null | undefined) {
  if (h == null) return { border: "border-l-slate-200", dot: "bg-slate-300" };
  if (h < 150) return { border: "border-l-emerald-500", dot: "bg-emerald-500" };
  if (h < 165) return { border: "border-l-sky-500", dot: "bg-sky-500" };
  return { border: "border-l-indigo-500", dot: "bg-indigo-500" };
}

function SeatCard({
  coord,
  student,
  highlight,
}: {
  coord: string;
  student: SeatRosterEntry | null;
  highlight: boolean;
}) {
  if (!student) {
    return (
      <div className="flex h-24 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-xs text-muted-foreground transition hover:border-primary/30 hover:bg-muted/60">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">{coord}</div>
        <div className="mt-0.5">Empty</div>
      </div>
    );
  }
  const accent = heightAccent(student.height_cm);
  return (
    <div
      className={
        "relative flex h-24 flex-col justify-between rounded-2xl border border-l-4 bg-card p-2.5 text-xs shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift " +
        accent.border +
        " " +
        (highlight
          ? "ring-2 ring-primary/60 shadow-[0_0_0_4px_rgb(37_99_235_/_0.15)]"
          : "border-border hover:border-primary/30")
      }
    >
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          {student.roll_number ?? "—"}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">{coord}</span>
      </div>
      <div className="truncate text-[11px] font-medium text-foreground">
        {student.full_name}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="truncate font-mono">
          {student.secret_code ? `@${student.secret_code}` : "—"}
        </span>
        <span className="flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
          {student.height_cm ? `${student.height_cm}cm` : "—"}
        </span>
      </div>
    </div>
  );
}
