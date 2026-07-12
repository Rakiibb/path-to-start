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
      {/* Control panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700">Rows</Label>
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
            <Label className="text-xs font-medium text-gray-700">Columns</Label>
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
            <Label className="text-xs font-medium text-gray-700">Filter</Label>
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
            <Label className="text-xs font-medium text-gray-700">Search</Label>
            <Input
              placeholder="Roll number or @secretcode"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {isCaptain && (
              <>
                <Button className="bg-sky-600 hover:bg-sky-700" onClick={handleGenerate}>
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
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <div className="text-sm text-gray-600">
            {sorted.length} student{sorted.length === 1 ? "" : "s"} · {layout.rows} × {layout.cols} = {totalSeats} seats
          </div>
          <div className="rounded-md border border-dashed border-gray-300 px-4 py-1 text-xs uppercase tracking-wide text-gray-500">
            ↑ Front of the Class ↑
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-500">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No student data available.
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}
          >
            {seats.map((s, i) => (
              <SeatCard key={i} index={i} student={s} highlight={isMatch(s)} />
            ))}
          </div>
        )}

        <div className="mt-4 hidden print:flex items-center justify-center">
          <div className="text-xs uppercase tracking-wide text-gray-500">↑ Front of the Class ↑</div>
        </div>
      </div>
    </PageLayout>
  );
}

function SeatCard({
  index,
  student,
  highlight,
}: {
  index: number;
  student: SeatRosterEntry | null;
  highlight: boolean;
}) {
  const seatNo = String(index + 1).padStart(2, "0");
  if (!student) {
    return (
      <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
        <div className="text-[10px] uppercase tracking-wide">Seat {seatNo}</div>
        <div>Empty Seat</div>
      </div>
    );
  }
  return (
    <div
      className={
        "relative flex h-24 flex-col justify-between rounded-lg border bg-white p-2 text-xs shadow-sm " +
        (highlight
          ? "border-amber-400 ring-2 ring-amber-300"
          : "border-gray-200 hover:border-sky-300")
      }
    >
      <div className="flex items-center justify-between">
        <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
          {student.roll_number ?? "—"}
        </span>
        <span className="text-[10px] text-gray-500">Seat {seatNo}</span>
      </div>
      <div className="truncate text-[11px] font-medium text-gray-800">
        {student.full_name}
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span className="truncate font-mono">
          {student.secret_code ? `@${student.secret_code}` : "—"}
        </span>
        <span>{student.height_cm ? `${student.height_cm}cm` : "—"}</span>
      </div>
    </div>
  );
}
