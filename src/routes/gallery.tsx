import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHero, seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/gallery")({
  head: () => seo("Photo Gallery | Skill Bridgeway Foundation", "Moments from our classes, events and graduations."),
  component: () => (
    <>
      <PageHero eyebrow="Moments" title="Gallery" />
      <ComingSoon phase="Phase 2" />
    </>
  ),
});
