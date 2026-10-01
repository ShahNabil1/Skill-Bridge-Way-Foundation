import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/")({
  head: () => seo("Skill Bridgeway Foundation — Free AI & Digital Skills in Bangladesh", "Free training in AI, freelancing and digital skills for young people across Bangladesh. Apply for free admission today."),
  component: Index,
});

function Index() {
  return (
    <section className="relative overflow-hidden bg-grid">
      <div className="mx-auto max-w-7xl px-4 py-24 md:py-36">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Non-profit · Bangladesh</p>
        <h1 className="section-title mt-4 max-w-4xl text-4xl leading-tight md:text-7xl">
          Bridging talent to the <span className="text-primary">digital</span> <span className="text-highlight">future</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg font-light text-muted-foreground">
          Free, practical training in AI, freelancing and digital skills — with verified certificates.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-highlight text-highlight-foreground hover:bg-highlight/90">
            <Link to="/admission">Apply for free</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground">
            <Link to="/courses">Explore courses</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
