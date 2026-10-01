import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHero, seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/notices")({
  head: () => seo("Notices & Events | Skill Bridgeway Foundation", "Latest notices, announcements and upcoming events."),
  component: () => (
    <>
      <PageHero eyebrow="Stay updated" title="Notices & Events" />
      <ComingSoon phase="Phase 2" />
    </>
  ),
});
