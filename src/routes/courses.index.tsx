import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHero, seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/courses/")({
  head: () => seo("Courses | Skill Bridgeway Foundation", "Browse free courses in AI, freelancing and digital skills."),
  component: () => (
    <>
      <PageHero eyebrow="Learn for free" title="Courses" />
      <ComingSoon phase="Phase 2" />
    </>
  ),
});
