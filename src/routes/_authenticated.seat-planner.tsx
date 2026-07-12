import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PlaceholderCard } from "@/components/smartclass/PageLayout";

export const Route = createFileRoute("/_authenticated/seat-planner")({
  component: () => (
    <PageLayout title="Seat Planner">
      <PlaceholderCard module="Seat Planner" />
    </PageLayout>
  ),
});
