import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PlaceholderCard } from "@/components/smartclass/PageLayout";

export const Route = createFileRoute("/_authenticated/sos")({
  component: () => (
    <PageLayout title="SOS">
      <PlaceholderCard module="SOS" />
    </PageLayout>
  ),
});
