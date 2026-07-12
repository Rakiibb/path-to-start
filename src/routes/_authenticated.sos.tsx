import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Siren, Search, MapPin, Clock } from "lucide-react";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAppUser } from "@/lib/auth";
import { createSos, listSos, updateSosDetails, updateSosStatus } from "@/services/sos.service";
import { listSeatRoster } from "@/services/seat.service";
import type { SosRequest } from "@/services/types";

export const Route = createFileRoute("/_authenticated/sos")({
  component: SosPage,
});

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

function SosCard({
  sos,
  poster,
  canResolve,
  onResolve,
}: {
  sos: SosRequest;
  poster?: { full_name: string; secret_code: string | null };
  canResolve: boolean;
  onResolve: (id: string) => void;
}) {
  const active = sos.status === "Active";
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        active ? "border-red-200 bg-red-50/40" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {poster?.full_name ?? "Unknown"}{" "}
            <span className="font-normal text-gray-500">
              @{poster?.secret_code ?? "—"}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="h-3.5 w-3.5" />
            {sos.location || <span className="italic text-gray-400">No location</span>}
          </p>
          {sos.message && (
            <p className="mt-2 text-sm text-gray-700">{sos.message}</p>
          )}
          <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" /> {timeAgo(sos.created_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={active ? "destructive" : "secondary"}>{sos.status}</Badge>
          {active && canResolve && (
            <Button size="sm" variant="outline" onClick={() => onResolve(sos.id)}>
              Mark Resolved
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SosPage() {
  const qc = useQueryClient();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const meQ = useQuery({ queryKey: ["me"], queryFn: getCurrentAppUser, staleTime: 60_000 });
  const isCaptain = meQ.data?.role === "captain";

  const sosQ = useQuery({ queryKey: ["sos"], queryFn: listSos });
  const rosterQ = useQuery({ queryKey: ["seat-roster"], queryFn: listSeatRoster });

  const posterById = useMemo(() => {
    const map = new Map<string, { full_name: string; secret_code: string | null }>();
    for (const r of rosterQ.data ?? [])
      map.set(r.id, { full_name: r.full_name, secret_code: r.secret_code });
    return map;
  }, [rosterQ.data]);

  useEffect(() => {
    const ch = supabase
      .channel("sos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_requests" },
        () => qc.invalidateQueries({ queryKey: ["sos"] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as { title: string; message: string | null };
          toast(n.title, { description: n.message ?? undefined });
          qc.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const createM = useMutation({
    mutationFn: () => createSos({}),
    onSuccess: (row) => {
      setPendingId(row.id);
      setLocation("");
      setMessage("");
      setDetailsOpen(true);
      qc.invalidateQueries({ queryKey: ["sos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveM = useMutation({
    mutationFn: () => {
      if (!pendingId) throw new Error("No SOS to update");
      if (!location.trim()) throw new Error("Location is required");
      return updateSosDetails(pendingId, {
        location: location.trim(),
        message: message.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Details saved");
      setDetailsOpen(false);
      setPendingId(null);
      qc.invalidateQueries({ queryKey: ["sos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveM = useMutation({
    mutationFn: (id: string) => updateSosStatus(id, "Resolved"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const all = sosQ.data ?? [];
  const filter = (r: SosRequest) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const p = posterById.get(r.user_id);
    return (
      (r.location ?? "").toLowerCase().includes(q) ||
      (p?.secret_code ?? "").toLowerCase().includes(q)
    );
  };
  const active = all.filter((r) => r.status === "Active").filter(filter);
  const history = all.filter((r) => r.status === "Resolved").filter(filter).slice(0, 20);

  return (
    <PageLayout
      title="SOS Emergency"
      description="Send an emergency alert to everyone in the classroom."
    >
      {!isCaptain && (
      <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Siren className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">🚨 Emergency Help</h2>
          <p className="mt-1 text-sm text-gray-500">
            One tap alerts every logged-in user instantly.
          </p>
          <Button
            size="lg"
            className="mt-6 h-14 w-full max-w-xs bg-red-600 text-base font-semibold hover:bg-red-700"
            disabled={createM.isPending}
            onClick={() => createM.mutate()}
          >
            {createM.isPending ? "Sending…" : "SEND SOS"}
          </Button>
        </div>
      </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by location or secret code"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Active SOS
        </h3>
        {sosQ.isLoading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No active emergency.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((r) => (
              <SosCard
                key={r.id}
                sos={r}
                poster={posterById.get(r.user_id)}
                canResolve={isCaptain}
                onResolve={(id) => resolveM.mutate(id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          SOS History
        </h3>
        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No resolved requests yet.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {history.map((r) => (
              <SosCard
                key={r.id}
                sos={r}
                poster={posterById.get(r.user_id)}
                canResolve={false}
                onResolve={() => {}}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={detailsOpen} onOpenChange={(o) => !saveM.isPending && setDetailsOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SOS Details</DialogTitle>
            <DialogDescription>
              Your alert was sent. Add your location so help can reach you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="sos-location">Current Location *</Label>
              <Input
                id="sos-location"
                placeholder="e.g. Classroom 305, Library, Playground"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sos-message">Short Message (optional)</Label>
              <Textarea
                id="sos-message"
                rows={3}
                placeholder="Anything responders should know"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={saveM.isPending || !location.trim()}
              onClick={() => saveM.mutate()}
            >
              {saveM.isPending ? "Saving…" : "Save Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}