import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PlaceholderCard } from "@/components/smartclass/PageLayout";

export const Route = createFileRoute("/_authenticated/class-feedback")({
  component: () => (
    <PageLayout title="Class Feedback">
      <PlaceholderCard module="Class Feedback" />
    </PageLayout>
  ),
});
