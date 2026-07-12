import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getMe } from "@/services/users.service";
import { changeMyPassword, changeMySecretCode } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900">{value}</p>
    </div>
  );
}

function ProfilePage() {
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["me-full"], queryFn: getMe });
  const me = meQ.data;

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [scCurrentPw, setScCurrentPw] = useState("");
  const [scNew, setScNew] = useState("");
  const [scConfirmOpen, setScConfirmOpen] = useState(false);

  const pwM = useMutation({
    mutationFn: () => {
      if (newPw.length < 6) throw new Error("New password must be at least 6 characters.");
      if (newPw !== confirmPw) throw new Error("Passwords do not match.");
      return changeMyPassword({ data: { currentPassword: currentPw, newPassword: newPw } });
    },
    onSuccess: () => {
      toast.success("Password updated");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scM = useMutation({
    mutationFn: () =>
      changeMySecretCode({ data: { currentPassword: scCurrentPw, newSecretCode: scNew.trim() } }),
    onSuccess: () => {
      toast.success("Secret code updated");
      setScCurrentPw(""); setScNew(""); setScConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["me-full"] });
    },
    onError: (e: Error) => { toast.error(e.message); setScConfirmOpen(false); },
  });

  if (meQ.isLoading) {
    return (
      <PageLayout title="Profile" description="Your account details.">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </PageLayout>
    );
  }
  if (!me) {
    return (
      <PageLayout title="Profile" description="Your account details.">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Profile not available.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Profile" description="Your account details and security settings.">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-lg font-semibold text-sky-700">
            {me.full_name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{me.full_name}</h2>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">{me.role}</Badge>
              {me.secret_code && (
                <span className="text-xs text-gray-500">@{me.secret_code}</span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Roll Number" value={me.roll_number ?? "—"} />
          <Field label="Secret Code" value={me.secret_code ?? "—"} />
          <Field label="Role" value={<span className="capitalize">{me.role}</span>} />
          <Field label="Height" value={me.height_cm ? `${me.height_cm} cm` : "—"} />
          <Field
            label="Joined"
            value={new Date(me.created_at).toLocaleDateString()}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
        <p className="mt-1 text-sm text-gray-500">
          Enter your current password to set a new one.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="cur-pw">Current Password</Label>
            <Input id="cur-pw" type="password" value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="new-pw">New Password</Label>
            <Input id="new-pw" type="password" value={newPw}
              onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cnf-pw">Confirm Password</Label>
            <Input id="cnf-pw" type="password" value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            disabled={pwM.isPending || !currentPw || !newPw || !confirmPw}
            onClick={() => pwM.mutate()}
          >
            {pwM.isPending ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Change Secret Code</h3>
        <p className="mt-1 text-sm text-gray-500">
          4–20 characters (letters, numbers, underscore, dot). Must be unique.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="sc-pw">Current Password</Label>
            <Input id="sc-pw" type="password" value={scCurrentPw}
              onChange={(e) => setScCurrentPw(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sc-new">New Secret Code</Label>
            <Input id="sc-new" value={scNew}
              onChange={(e) => setScNew(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            disabled={scM.isPending || !scCurrentPw || !scNew.trim()}
            onClick={() => setScConfirmOpen(true)}
          >
            {scM.isPending ? "Updating…" : "Update Secret Code"}
          </Button>
        </div>
      </div>

      <AlertDialog open={scConfirmOpen} onOpenChange={setScConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change your secret code?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need this new code the next time you sign in. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={scM.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={scM.isPending} onClick={() => scM.mutate()}>
              {scM.isPending ? "Updating…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
