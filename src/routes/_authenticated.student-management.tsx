import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { getCurrentAppUser } from "@/lib/auth";
import {
  adminListUsers,
  adminCreateStudent,
  adminUpdateStudent,
  adminDeleteStudent,
  adminResetPassword,
  adminResetSecretCode,
  type AdminUserRow,
} from "@/services/users.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Pencil, Trash2, RotateCcw, Plus, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student-management")({
  component: StudentManagementPage,
});

const createSchema = z.object({
  fullName: z.string().trim().min(1, "Required").max(120),
  rollNumber: z
    .string()
    .trim()
    .regex(/^\d+$/, "Roll number must contain digits only")
    .max(40),
  password: z.string().min(6, "Min 6 characters").max(100),
  heightCm: z
    .string()
    .refine((v) => v === "" || (Number(v) > 0 && Number.isInteger(Number(v))), "Positive integer")
    .optional(),
  role: z.enum(["student", "captain"]),
});
type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  fullName: z.string().trim().min(1, "Required").max(120),
  password: z.string().optional().refine((v) => !v || v.length >= 6, "Min 6 characters"),
  heightCm: z
    .string()
    .refine((v) => v === "" || (Number(v) > 0 && Number.isInteger(Number(v))), "Positive integer")
    .optional(),
  role: z.enum(["student", "captain"]),
});
type EditValues = z.infer<typeof editSchema>;

const resetPwSchema = z.object({
  password: z.string().min(6, "Min 6 characters").max(100),
});
type ResetPwValues = z.infer<typeof resetPwSchema>;

function StudentManagementPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getCurrentAppUser });

  useEffect(() => {
    if (me && me.role !== "captain") {
      navigate({ to: "/", replace: true });
    }
  }, [me, navigate]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminListUsers,
    enabled: me?.role === "captain",
  });

  // Realtime subscription.
  useEffect(() => {
    if (me?.role !== "captain") return;
    const channel = supabase
      .channel("users-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, qc]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "student" | "captain">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== "all" && u.role !== filter) return false;
      if (!q) return true;
      return (
        (u.roll_number ?? "").toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q) ||
        (u.secret_code ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search, filter]);

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [pwTarget, setPwTarget] = useState<AdminUserRow | null>(null);
  const [resetCodeTarget, setResetCodeTarget] = useState<AdminUserRow | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  if (me && me.role !== "captain") return null;

  return (
    <PageLayout
      title="Student Management"
      description="Manage classroom students and their accounts."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by roll number, name, or secret code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72"
          />
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="captain">Captains</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => toast.info("CSV import coming soon.")}
          >
            <Upload className="mr-2 h-4 w-4" /> Import Students (CSV)
          </Button>
          <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Roll Number</th>
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">Secret Code</th>
              <th className="px-4 py-3">Height (cm)</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const active = !!u.secret_code;
                const isSelf = me?.id === u.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.roll_number ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-900">{u.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {u.secret_code ? `@${u.secret_code}` : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{u.height_cm ?? "—"}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">{u.role}</td>
                    <td className="px-4 py-3">
                      {active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                          Secret Code Not Set
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditTarget(u)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPwTarget(u)} title="Reset password">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setResetCodeTarget(u)}
                          title="Reset secret code"
                          disabled={!u.secret_code}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteTarget(u)}
                          disabled={isSelf}
                          title={isSelf ? "You cannot delete yourself" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AddDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={invalidate} />
      <EditDialog target={editTarget} onOpenChange={() => setEditTarget(null)} onSuccess={invalidate} />
      <ResetPasswordDialog target={pwTarget} onOpenChange={() => setPwTarget(null)} onSuccess={invalidate} />
      <ConfirmDialog
        open={!!resetCodeTarget}
        onOpenChange={() => setResetCodeTarget(null)}
        title="Reset Secret Code?"
        description={`This clears the Secret Code for ${resetCodeTarget?.full_name}. They will create a new one on next login.`}
        confirmText="Reset Secret Code"
        onConfirm={async () => {
          if (!resetCodeTarget) return;
          try {
            await adminResetSecretCode(resetCodeTarget.id);
            toast.success("Secret code cleared.");
            invalidate();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          } finally {
            setResetCodeTarget(null);
          }
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete user?"
        description={`This permanently deletes ${deleteTarget?.full_name}. This action cannot be undone.`}
        confirmText="Delete"
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await adminDeleteStudent(deleteTarget.id);
            toast.success("User deleted.");
            invalidate();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          } finally {
            setDeleteTarget(null);
          }
        }}
      />
    </PageLayout>
  );
}

/* ---------------- Reusable Dialogs ---------------- */

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  onConfirm,
  destructive,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-red-600 hover:bg-red-700" : "bg-sky-600 hover:bg-sky-700"}
            onClick={onConfirm}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AddDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { fullName: "", rollNumber: "", password: "", heightCm: "", role: "student" },
  });
  const mutation = useMutation({
    mutationFn: async (values: CreateValues) =>
      adminCreateStudent({
        fullName: values.fullName,
        rollNumber: values.rollNumber,
        password: values.password,
        heightCm: values.heightCm ? Number(values.heightCm) : null,
        role: values.role,
      }),
    onSuccess: () => {
      toast.success("Student created.");
      form.reset();
      onOpenChange(false);
      onSuccess();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
          <Field label="Full Name" error={form.formState.errors.fullName?.message}>
            <Input {...form.register("fullName")} />
          </Field>
          <Field label="Roll Number" error={form.formState.errors.rollNumber?.message}>
            <Input inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 101" {...form.register("rollNumber")} />
          </Field>
          <Field label="Default Password" error={form.formState.errors.password?.message}>
            <Input type="password" {...form.register("password")} />
          </Field>
          <Field label="Height (cm)" error={form.formState.errors.heightCm?.message}>
            <Input type="number" min={1} {...form.register("heightCm")} />
          </Field>
          <Field label="Role">
            <Select
              value={form.watch("role")}
              onValueChange={(v) => form.setValue("role", v as "student" | "captain")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="captain">Captain</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  target,
  onOpenChange,
  onSuccess,
}: {
  target: AdminUserRow | null;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { fullName: "", password: "", heightCm: "", role: "student" },
  });

  useEffect(() => {
    if (target) {
      form.reset({
        fullName: target.full_name,
        password: "",
        heightCm: target.height_cm != null ? String(target.height_cm) : "",
        role: target.role,
      });
    }
  }, [target, form]);

  const mutation = useMutation({
    mutationFn: async (values: EditValues) => {
      if (!target) return;
      return adminUpdateStudent({
        id: target.id,
        fullName: values.fullName,
        password: values.password || undefined,
        heightCm: values.heightCm ? Number(values.heightCm) : null,
        role: values.role,
      });
    },
    onSuccess: () => {
      toast.success("User updated.");
      onOpenChange(false);
      onSuccess();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
          <Field label="Roll Number">
            <Input value={target?.roll_number ?? ""} disabled />
          </Field>
          <Field label="Full Name" error={form.formState.errors.fullName?.message}>
            <Input {...form.register("fullName")} />
          </Field>
          <Field label="New Password (leave blank to keep)" error={form.formState.errors.password?.message}>
            <Input type="password" {...form.register("password")} />
          </Field>
          <Field label="Height (cm)" error={form.formState.errors.heightCm?.message}>
            <Input type="number" min={1} {...form.register("heightCm")} />
          </Field>
          <Field label="Role">
            <Select
              value={form.watch("role")}
              onValueChange={(v) => form.setValue("role", v as "student" | "captain")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="captain">Captain</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  target,
  onOpenChange,
  onSuccess,
}: {
  target: AdminUserRow | null;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const form = useForm<ResetPwValues>({
    resolver: zodResolver(resetPwSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    if (target) form.reset({ password: "" });
  }, [target, form]);

  const mutation = useMutation({
    mutationFn: async (values: ResetPwValues) => {
      if (!target) return;
      return adminResetPassword(target.id, values.password);
    },
    onSuccess: () => {
      toast.success("Password reset.");
      onOpenChange(false);
      onSuccess();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
          <p className="text-sm text-gray-500">
            Reset password for <span className="font-medium">{target?.full_name}</span>. The Secret Code is kept.
          </p>
          <Field label="New Password" error={form.formState.errors.password?.message}>
            <Input type="password" {...form.register("password")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving…" : "Reset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-700">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}