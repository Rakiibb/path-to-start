import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { getCurrentAppUser } from "@/lib/auth";
import { adminCreateStudent } from "@/services/users.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, Upload, DatabaseBackup, Save, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type Settings = {
  school_name: string;
  class_name: string;
  sos_enabled: boolean;
  feedback_enabled: boolean;
  min_password_length: number;
  require_password_number: boolean;
  require_password_symbol: boolean;
  demo_mode: boolean;
};

const BACKUP_TABLES = [
  "users",
  "feedback",
  "feedback_votes",
  "notifications",
  "school_rules",
  "seat_students",
  "sos_requests",
  "app_settings",
] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getCurrentAppUser,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!meLoading && me && me.role !== "captain") {
      navigate({ to: "/", replace: true });
    }
  }, [me, meLoading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async (): Promise<Settings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select(
          "school_name, class_name, sos_enabled, feedback_enabled, min_password_length, require_password_number, require_password_symbol, demo_mode",
        )
        .eq("id", true)
        .single();
      if (error) throw error;
      return data as Settings;
    },
    enabled: me?.role === "captain",
  });

  const [form, setForm] = useState<Settings | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      const { error } = await supabase
        .from("app_settings")
        .update(patch)
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app_settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function exportTable(table: (typeof BACKUP_TABLES)[number]) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      toast.error(`Export failed: ${error.message}`);
      return;
    }
    download(`${table}.json`, JSON.stringify(data, null, 2), "application/json");
  }

  async function exportDatabase() {
    const dump: Record<string, unknown> = { exported_at: new Date().toISOString() };
    for (const t of BACKUP_TABLES) {
      const { data, error } = await supabase.from(t).select("*");
      if (error) {
        toast.error(`${t}: ${error.message}`);
        return;
      }
      dump[t] = data;
    }
    download(
      `smartclass-export-${Date.now()}.json`,
      JSON.stringify(dump, null, 2),
      "application/json",
    );
    toast.success("Database exported");
  }

  const backup = useMutation({
    mutationFn: exportDatabase,
  });

  const demo = useMutation({
    mutationFn: async (enable: boolean) => {
      const fn = enable ? "enable_demo_mode" : "disable_demo_mode";
      // rpc name not in generated types
      const { error } = await (supabase.rpc as unknown as (n: string) => Promise<{ error: { message: string } | null }>)(fn);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, enable) => {
      toast.success(enable ? "Demo data loaded" : "Demo data removed");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) throw new Error("CSV is empty");
      const required = ["full_name", "roll_number", "password"];
      const missing = required.filter((r) => !(r in rows[0]));
      if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);

      let ok = 0;
      const errors: string[] = [];
      for (const [i, r] of rows.entries()) {
        try {
          if (!/^\d+$/.test((r.roll_number ?? "").trim())) {
            throw new Error("roll_number must contain digits only");
          }
          await adminCreateStudent({
            fullName: r.full_name,
            rollNumber: r.roll_number,
            password: r.password,
            heightCm: r.height_cm ? Number(r.height_cm) : null,
            role: (r.role === "captain" ? "captain" : "student"),
          });
          ok++;
        } catch (e) {
          errors.push(`Row ${i + 2}: ${(e as Error).message}`);
        }
      }
      return { ok, errors };
    },
    onSuccess: ({ ok, errors }) => {
      toast.success(`Imported ${ok} student(s)`);
      if (errors.length) toast.error(errors.slice(0, 3).join("\n"));
      if (fileInput.current) fileInput.current.value = "";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (meLoading || !me) {
    return (
      <PageLayout title="Settings">
        <div className="text-sm text-gray-500">Loading…</div>
      </PageLayout>
    );
  }

  if (me.role !== "captain") return null;

  return (
    <PageLayout
      title="Settings"
      description="Manage school configuration, feature toggles and data."
    >
      {isLoading || !form ? (
        <div className="text-sm text-gray-500">Loading settings…</div>
      ) : (
        <div className="space-y-6">
          <Section title="School" description="Basic identity of your classroom.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>School Name</Label>
                <Input
                  value={form.school_name}
                  onChange={(e) => setForm({ ...form, school_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Class Name</Label>
                <Input
                  value={form.class_name}
                  onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={() =>
                  save.mutate({
                    school_name: form.school_name.trim(),
                    class_name: form.class_name.trim(),
                  })
                }
                disabled={save.isPending}
              >
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </Section>

          <Section title="Modules" description="Enable or disable classroom features.">
            <div className="space-y-4">
              <ToggleRow
                label="SOS Emergency"
                description="Allow students to send emergency alerts."
                checked={form.sos_enabled}
                onChange={(v) => {
                  setForm({ ...form, sos_enabled: v });
                  save.mutate({ sos_enabled: v });
                }}
              />
              <ToggleRow
                label="Class Feedback"
                description="Allow anonymous feedback submissions."
                checked={form.feedback_enabled}
                onChange={(v) => {
                  setForm({ ...form, feedback_enabled: v });
                  save.mutate({ feedback_enabled: v });
                }}
              />
            </div>
          </Section>

          <Section
            title="Data"
            description="Export, back up or import classroom data."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Button variant="outline" onClick={exportDatabase}>
                <Download className="mr-2 h-4 w-4" /> Export Database
              </Button>
              <Button
                variant="outline"
                onClick={() => backup.mutate()}
                disabled={backup.isPending}
              >
                <DatabaseBackup className="mr-2 h-4 w-4" />
                {backup.isPending ? "Backing up…" : "Backup Database"}
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInput.current?.click()}
                disabled={importCsv.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {importCsv.isPending ? "Importing…" : "Import Students CSV"}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importCsv.mutate(f);
                }}
              />
            </div>
            <div className="mt-4 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
              <div className="mb-1 font-medium text-gray-700">CSV columns</div>
              <code>full_name, roll_number, password, height_cm (optional), role (optional)</code>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {BACKUP_TABLES.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => exportTable(t)}
                >
                  <Download className="mr-1 h-3 w-3" />
                  {t}
                </Button>
              ))}
            </div>
          </Section>

          <Section
            title="Demo Mode"
            description="Populate the app with realistic sample data for hackathon demos. Real data is never touched."
          >
            <div className="flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  {form.demo_mode ? "Demo Mode is ON" : "Demo Mode is OFF"}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  Enables 30 students, 3 captains, 50 feedback (verified / pending / rejected),
                  random votes, 10 SOS history, 20 notifications and 25 school rules.
                </div>
              </div>
              {form.demo_mode ? (
                <Button
                  variant="outline"
                  onClick={() => demo.mutate(false)}
                  disabled={demo.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {demo.isPending ? "Removing…" : "Disable"}
                </Button>
              ) : (
                <Button
                  onClick={() => demo.mutate(true)}
                  disabled={demo.isPending}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {demo.isPending ? "Seeding…" : "Enable"}
                </Button>
              )}
            </div>
          </Section>
        </div>
      )}
    </PageLayout>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 p-3">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs text-gray-500">{description}</div>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") {
          out.push(cur);
          cur = "";
        } else cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = split(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return row;
  });
}