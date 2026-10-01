import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHero, seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/verify")({
  head: () => seo("Verify Certificate | Skill Bridgeway Foundation", "Verify a Skill Bridgeway Foundation certificate by serial number or QR code."),
  component: () => (
    <>
      <PageHero eyebrow="Verification portal" title="Verify Certificate" />
      <ComingSoon phase="Phase 5" />
    </>
  ),
});
