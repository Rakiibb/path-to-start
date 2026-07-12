import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PlaceholderCard } from "@/components/smartclass/PageLayout";

export const Route = createFileRoute("/_authenticated/feedback")({
  component: () => (
    <PageLayout title="Feedback">
      <PlaceholderCard module="Feedback" />
    </PageLayout>
  ),
});
