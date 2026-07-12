import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadBlob(name: string, content: BlobPart, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function timestamp(d: Date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function escapeCsvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const r of rows) lines.push(r.map(escapeCsvCell).join(","));
  return lines.join("\n");
}

export function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const csv = "\ufeff" + toCsv(headers, rows); // BOM for Excel
  downloadBlob(`${filename}_${timestamp()}.csv`, csv, "text/csv;charset=utf-8;");
}

export type PdfSection = {
  heading?: string;
  columns: string[];
  rows: (string | number)[][];
};

export function exportPdf(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  orientation?: "portrait" | "landscape";
}) {
  const doc = new jsPDF({
    orientation: opts.orientation ?? "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(opts.title, margin, 50);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const generated = `Generated: ${new Date().toLocaleString()}`;
  doc.text(generated, pageWidth - margin, 50, { align: "right" });

  if (opts.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(opts.subtitle, margin, 68);
  }

  let cursorY = opts.subtitle ? 88 : 72;

  for (const section of opts.sections) {
    if (section.heading) {
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(section.heading, margin, cursorY);
      cursorY += 8;
    }
    autoTable(doc, {
      startY: cursorY + 4,
      head: [section.columns],
      body: section.rows.map((r) => r.map((c) => (c ?? "").toString())),
      styles: { fontSize: 9, cellPadding: 5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [240, 249, 255] },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error autoTable augments doc with lastAutoTable
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 20;
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `SmartClass · Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  doc.save(`${opts.filename}_${timestamp()}.pdf`);
}