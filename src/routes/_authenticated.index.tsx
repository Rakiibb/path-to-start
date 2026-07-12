import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PlaceholderCard } from "@/components/smartclass/PageLayout";

export const Route = createFileRoute("/_authenticated/")({
  component: () => (
    <PageLayout title="Dashboard" description="Overview of your classroom activity.">
      <PlaceholderCard module="Dashboard" />
    </PageLayout>
  ),
});