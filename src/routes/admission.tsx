import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHero, seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/admission")({
  head: () => seo("Free Admission | Skill Bridgeway Foundation", "Apply for free admission to our digital skills courses."),
  component: () => (
    <>
      <PageHero eyebrow="Admission open" title="Free Admission" />
      <ComingSoon phase="Phase 3" />
    </>
  ),
});
