import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, HeartHandshake, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero, seo } from "@/components/site/PageHero";
import { SectionHeading } from "@/components/site/ui-bits";

export const Route = createFileRoute("/about")({
  head: () => seo("About Us | Skill Bridgeway Foundation", "Our mission to bring free AI, freelancing and digital skills training to young people across Bangladesh."),
  component: About,
});

const VALUES = [
  { icon: Target, title: "Mission", text: "Give every motivated young person in Bangladesh free access to the AI and digital skills that lead to real income." },
  { icon: Eye, title: "Vision", text: "A Bangladesh where talent, not money, decides who gets to build the digital future." },
  { icon: HeartHandshake, title: "Values", text: "Free education, honest outcomes, verifiable achievement and human-first technology." },
];

function About() {
  return (
    <>
      <PageHero eyebrow="Who we are" title="About Us">
        Skill Bridgeway Foundation is a non-profit bridging the gap between human potential and the opportunities of the AI era.
      </PageHero>
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="glass rounded-xl p-6">
              <v.icon className="h-8 w-8 text-primary" />
              <h2 className="section-title mt-4 text-lg">{v.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="border-y bg-grid">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 lg:grid-cols-2">
          <SectionHeading eyebrow="Our story" title="Why we exist" />
          <div className="space-y-4 text-muted-foreground">
            <p>Millions of young Bangladeshis have the drive to work globally but lack access to quality, affordable training. Paid courses are out of reach for many.</p>
            <p>We run free, mentor-led programs in AI, freelancing and digital skills, then issue certificates that anyone can verify online — so learners can prove what they know.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
        <h2 className="section-title text-2xl">Join our next batch</h2>
        <Button asChild size="lg" className="bg-highlight text-highlight-foreground hover:bg-highlight/90"><Link to="/admission">Free Admission</Link></Button>
      </section>
    </>
  );
}
