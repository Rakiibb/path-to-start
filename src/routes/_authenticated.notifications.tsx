import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PlaceholderCard } from "@/components/smartclass/PageLayout";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: () => (
    <PageLayout title="Notifications">
      <PlaceholderCard module="Notifications" />
    </PageLayout>
  ),
});
