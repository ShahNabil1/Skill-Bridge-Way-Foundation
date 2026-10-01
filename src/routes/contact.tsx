import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHero, seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/contact")({
  head: () => seo("Contact | Skill Bridgeway Foundation", "Get in touch with Skill Bridgeway Foundation."),
  component: () => (
    <>
      <PageHero eyebrow="Talk to us" title="Contact" />
      <ComingSoon phase="Phase 2" />
    </>
  ),
});
