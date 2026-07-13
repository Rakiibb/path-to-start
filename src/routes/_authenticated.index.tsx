import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  Wallet,
  Siren,
  Plus,
  ListChecks,
  Armchair,
  BookOpen,
  Bell,
  MapPin,
} from "lucide-react";
import { PageLayout } from "@/components/smartclass/PageLayout";
import { StatCard } from "@/components/smartclass/dashboard/StatCard";
import {
  DashboardCard,
  EmptyState,
  SkeletonLine,
} from "@/components/smartclass/dashboard/DashboardCard";
import { FeedbackItem } from "@/components/smartclass/dashboard/FeedbackItem";
import { supabase } from "@/integrations/supabase/client";
import type { Feedback, FeedbackVote, Notification, SosRequest } from "@/services/types";

async function fetchDashboard() {
  const [feedbackRes, sosRes, notifRes, votesRes] = await Promise.all([
    supabase.from("feedback").select("*").order("created_at", { ascending: false }),
    supabase.from("sos_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("feedback_votes").select("*"),
  ]);
  if (feedbackRes.error) throw feedbackRes.error;
  if (sosRes.error) throw sosRes.error;
  if (notifRes.error) throw notifRes.error;
  if (votesRes.error) throw votesRes.error;
  return {
    feedback: (feedbackRes.data ?? []) as Feedback[],
    sos: (sosRes.data ?? []) as SosRequest[],
    notifications: (notifRes.data ?? []) as Notification[],
    votes: (votesRes.data ?? []) as FeedbackVote[],
  };
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const QUICK_ACTIONS = [
  { to: "/class-feedback", label: "Class Feedback", icon: Plus },
  { to: "/captain-feedback", label: "Captain Feedback", icon: ListChecks },
  { to: "/seat-planner", label: "Seat Planner", icon: Armchair },
  { to: "/sos", label: "SOS", icon: Siren },
  { to: "/school-rules", label: "School Rules", icon: BookOpen },
] as const;

function DashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const feedback = data?.feedback ?? [];
  const votes = data?.votes ?? [];
  const sos = data?.sos ?? [];
  const notifications = data?.notifications ?? [];

  const totalFeedback = feedback.length;
  const pending = feedback.filter((f) => f.status === "Pending").length;
  const verified = feedback.filter((f) => f.status === "Verified").length;
  const fundTotal = feedback.reduce((sum, f) => sum + Number(f.amount ?? 0), 0);
  const activeSos = sos.filter((s) => s.status === "Active");
  const recentFeedback = feedback.slice(0, 4);
  const votesByFeedback = new Map<string, FeedbackVote[]>();
  for (const v of votes) {
    const list = votesByFeedback.get(v.feedback_id) ?? [];
    list.push(v);
    votesByFeedback.set(v.feedback_id, list);
  }

  return (
    <PageLayout title="Dashboard" description="Overview of your classroom activity.">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={MessageSquare} title="Total Feedback" value={totalFeedback} subtitle="All submissions" loading={isLoading} />
        <StatCard icon={Clock} title="Pending" value={pending} subtitle="Awaiting review" loading={isLoading} />
        <StatCard icon={CheckCircle2} title="Verified" value={verified} subtitle="Approved feedback" loading={isLoading} />
        <StatCard icon={Wallet} title="Reported Fund" value={`৳ ${fundTotal.toLocaleString()}`} subtitle="Total reported" loading={isLoading} />
        <StatCard icon={Siren} title="Active SOS" value={activeSos.length} subtitle="Ongoing alerts" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <DashboardCard
            title="Recent Feedback"
            action={
              <Link
                to="/class-feedback"
                className="text-sm font-medium text-sky-600 hover:text-sky-700"
              >
                View All Feedback →
              </Link>
            }
          >
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <SkeletonLine key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : recentFeedback.length === 0 ? (
              <EmptyState message="No feedback available." />
            ) : (
              <div className="space-y-3">
                {recentFeedback.map((f) => (
                  <FeedbackItem
                    key={f.id}
                    feedback={f}
                    votes={votesByFeedback.get(f.id) ?? []}
                  />
                ))}
              </div>
            )}
          </DashboardCard>

          <DashboardCard title="Active SOS">
            {isLoading ? (
              <SkeletonLine className="h-20 w-full" />
            ) : activeSos.length === 0 ? (
              <EmptyState message="No active emergency." />
            ) : (
              <div className="space-y-3">
                {activeSos.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                          {s.status}
                        </span>
                        {s.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin size={12} /> {s.location}
                          </span>
                        )}
                      </div>
                      {s.message && (
                        <p className="mt-1 line-clamp-1 text-sm text-foreground/80">{s.message}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">{timeAgo(s.created_at)}</p>
                    </div>
                    <Link
                      to="/sos"
                      className="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                    >
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <DashboardCard title="Quick Actions">
            <div className="grid grid-cols-1 gap-2">
              {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Recent Notifications">
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <SkeletonLine key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState message="No notifications." />
            ) : (
              <ul className="space-y-3">
                {notifications.map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <div className="relative mt-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Bell size={14} />
                      </div>
                      {!n.is_read && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                      {n.message && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">{n.message}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </div>
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardView,
});