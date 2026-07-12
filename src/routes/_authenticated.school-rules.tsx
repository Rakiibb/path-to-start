import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAppUser } from "@/lib/auth";
import {
  RULE_CATEGORIES, listRules, createRule, updateRule, deleteRule,
} from "@/services/rules.service";
import type { SchoolRule } from "@/services/types";

export const Route = createFileRoute("/_authenticated/school-rules")({
  component: SchoolRulesPage,
});

type Category = (typeof RULE_CATEGORIES)[number];
const FILTERS = ["All", ...RULE_CATEGORIES] as const;

function RuleCard({
  rule, canManage, onEdit, onDelete,
}: {
  rule: SchoolRule;
  canManage: boolean;
  onEdit: (r: SchoolRule) => void;
  onDelete: (r: SchoolRule) => void;
}) {
  const [open, setOpen] = useState(false);
  const desc = rule.description ?? "";
  const long = desc.length > 220;
  const shown = !long || open ? desc : desc.slice(0, 220) + "…";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {rule.rule_number != null && (
              <span className="text-xs font-semibold text-gray-500">
                #{rule.rule_number}
              </span>
            )}
            <Badge variant="secondary">{rule.category}</Badge>
          </div>
          <h3 className="mt-2 text-base font-semibold text-gray-900">{rule.title}</h3>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => onEdit(rule)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(rule)}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        )}
      </div>
      {desc && (
        <div className="mt-2 text-sm text-gray-600">
          <p className="whitespace-pre-wrap">{shown}</p>
          {long && (
            <button
              type="button"
              className="mt-1 text-xs font-medium text-sky-600 hover:underline"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Read Less" : "Read More"}
            </button>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-gray-400">
        Last updated {new Date(rule.updated_at ?? rule.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}

type FormState = {
  rule_number: string;
  category: Category;
  title: string;
  description: string;
};
const EMPTY_FORM: FormState = {
  rule_number: "", category: "General", title: "", description: "",
};

function RuleFormDialog({
  open, onOpenChange, initial, onSubmit, saving, mode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: FormState;
  onSubmit: (v: FormState) => void;
  saving: boolean;
  mode: "add" | "edit";
}) {
  const [form, setForm] = useState<FormState>(initial);
  useEffect(() => { if (open) setForm(initial); }, [open, initial]);
  const valid = form.title.trim().length > 0;
  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Rule" : "Edit Rule"}</DialogTitle>
          <DialogDescription>
            {mode === "add" ? "Create a new school rule." : "Update this school rule."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {mode === "add" && (
            <div>
              <Label htmlFor="rn">Rule Number</Label>
              <Input id="rn" type="number" value={form.rule_number}
                onChange={(e) => setForm({ ...form, rule_number: e.target.value })} />
            </div>
          )}
          <div>
            <Label>Category</Label>
            <Select value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v as Category })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RULE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="t">Title</Label>
            <Input id="t" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="d">Description</Label>
            <Textarea id="d" rows={5} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid || saving} onClick={() => onSubmit(form)}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SchoolRulesPage() {
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentAppUser, staleTime: 60_000 });
  const canManage = meQ.data?.role === "captain";

  const rulesQ = useQuery({ queryKey: ["school_rules"], queryFn: listRules });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof FILTERS)[number]>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [editRule, setEditRule] = useState<SchoolRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolRule | null>(null);

  useEffect(() => {
    const ch = supabase
      .channel("school-rules-realtime")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "school_rules" },
        () => qc.invalidateQueries({ queryKey: ["school_rules"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const addM = useMutation({
    mutationFn: (v: FormState) => createRule({
      title: v.title.trim(),
      description: v.description.trim() || null,
      category: v.category,
      rule_number: v.rule_number ? Number(v.rule_number) : null,
    }),
    onSuccess: () => { toast.success("Rule added"); setAddOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const editM = useMutation({
    mutationFn: (v: FormState) => updateRule(editRule!.id, {
      title: v.title.trim(),
      description: v.description.trim() || null,
      category: v.category,
    }),
    onSuccess: () => { toast.success("Rule updated"); setEditRule(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () => { toast.success("Rule deleted"); setDeleteTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rulesQ.data ?? []).filter((r) => {
      if (category !== "All" && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [rulesQ.data, search, category]);

  const isEmptyDb = !rulesQ.isLoading && (rulesQ.data ?? []).length === 0;

  return (
    <PageLayout
      title="School Rules"
      description="Search and browse all school rules quickly."
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="h-11 pl-9"
            placeholder="Search school rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManage && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Rule
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={category === f ? "default" : "outline"}
            onClick={() => setCategory(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {rulesQ.isLoading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : isEmptyDb ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No school rules available.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No matching school rule found.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <RuleCard
              key={r.id}
              rule={r}
              canManage={canManage}
              onEdit={setEditRule}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <RuleFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initial={EMPTY_FORM}
        onSubmit={(v) => addM.mutate(v)}
        saving={addM.isPending}
        mode="add"
      />

      <RuleFormDialog
        open={!!editRule}
        onOpenChange={(v) => !v && setEditRule(null)}
        initial={editRule ? {
          rule_number: editRule.rule_number?.toString() ?? "",
          category: (editRule.category as Category) ?? "General",
          title: editRule.title,
          description: editRule.description ?? "",
        } : EMPTY_FORM}
        onSubmit={(v) => editM.mutate(v)}
        saving={editM.isPending}
        mode="edit"
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. "{deleteTarget?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && delM.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
