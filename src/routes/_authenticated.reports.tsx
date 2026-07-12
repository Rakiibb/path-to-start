import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PlaceholderCard } from "@/components/smartclass/PageLayout";

export const Route = createFileRoute("/_authenticated/reports")({
  component: () => (
    <PageLayout title="Reports">
      <PlaceholderCard module="Reports" />
    </PageLayout>
  ),
});
