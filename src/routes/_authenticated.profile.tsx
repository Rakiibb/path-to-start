import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PlaceholderCard } from "@/components/smartclass/PageLayout";

export const Route = createFileRoute("/_authenticated/profile")({
  component: () => (
    <PageLayout title="Profile">
      <PlaceholderCard module="Profile" />
    </PageLayout>
  ),
});
