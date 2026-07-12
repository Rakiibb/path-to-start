import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PlaceholderCard } from "@/components/smartclass/PageLayout";

export const Route = createFileRoute("/_authenticated/school-rules")({
  component: () => (
    <PageLayout title="School Rules">
      <PlaceholderCard module="School Rules" />
    </PageLayout>
  ),
});
