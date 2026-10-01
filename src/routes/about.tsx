import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHero, seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/about")({
  head: () => seo("About Us | Skill Bridgeway Foundation", "Our mission to bring free AI, freelancing and digital skills training to Bangladesh."),
  component: () => (
    <>
      <PageHero eyebrow="Who we are" title="About Us" />
      <ComingSoon phase="Phase 2" />
    </>
  ),
});
