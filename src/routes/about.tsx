import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Eye, Handshake, Lightbulb, MapPin, Scale, Sprout, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seo } from "@/components/site/PageHero";
import { SectionHeading } from "@/components/site/ui-bits";
import { BrandName } from "@/components/site/BrandName";
import workshop from "@/assets/learning-workshop.jpg";

export const Route = createFileRoute("/about")({ staticData: { sitemap: true },
  head: () => seo(
    "About Us | Skill Bridgeway Foundation",
    "RJSC-registered non-profit in Bangladesh building AI literacy, digital, freelancing and entrepreneurship skills for rural youth, madrasah students and underserved communities.",
    { path: "/about" },
  ),
  component: About,
});

const VALUES = [
  { icon: Users, title: "Inclusion & Accessibility", text: "We work to reduce barriers to skills development for rural youth, madrasah students and other underserved communities, with a commitment to ensuring that opportunity is not determined by geography, socioeconomic background or access to technology." },
  { icon: Lightbulb, title: "Future-Ready Learning", text: "We promote practical digital and AI literacy alongside critical thinking, communication, creativity, problem-solving and other human-centred skills needed to navigate a rapidly changing world of work." },
  { icon: Scale, title: "Integrity & Accountability", text: "We are committed to responsible governance, financial transparency, ethical conduct, political neutrality and accountability to the communities, partners and stakeholders we serve." },
  { icon: Sprout, title: "Empowerment & Sustainable Livelihoods", text: "We focus on translating learning into meaningful outcomes—including improved employability, freelancing opportunities, entrepreneurship, income generation and sustainable local enterprise." },
  { icon: MapPin, title: "Local Leadership & Community Impact", text: "We believe sustainable development is strongest when communities participate in shaping the solutions that affect them. Our programmes are designed to respond to local needs while connecting participants with wider national and global opportunities." },
  { icon: Handshake, title: "Partnership & Collaboration", text: "We seek meaningful partnerships with government institutions, development agencies, international donors, educational institutions, civil society organisations and responsible private-sector partners to strengthen programme quality, expand reach and achieve sustainable impact." },
  { icon: BarChart3, title: "Learning, Measurement & Continuous Improvement", text: "We are committed to measuring results, learning from evidence and participant feedback, and continuously improving our programmes to maximise their effectiveness and long-term impact." },
];

function About() {
  return (
    <>
      <section className="relative isolate flex min-h-[520px] items-end overflow-hidden border-b sm:min-h-[580px]">
        <img src={workshop} alt="Young people collaborating on digital skills in a learning space" width={1600} height={900} className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-background/75" />
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-12 pt-28 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)] lg:items-end lg:pb-16">
          <div className="min-w-0">
            <p className="editorial-kicker">Who we are / Bangladesh</p>
            <h1 className="section-title mt-6 max-w-4xl text-4xl leading-tight sm:text-6xl lg:text-7xl"><BrandName /></h1>
            <p className="mt-6 max-w-2xl border-l border-primary pl-5 text-base leading-relaxed text-foreground sm:text-lg">A Bangladesh-based, non-profit organisation incorporated with the Registrar of Joint Stock Companies and Firms (RJSC), expanding access to practical, future-relevant skills and economic opportunities.</p>
          </div>
          <div className="grid grid-cols-2 gap-5 border-t border-primary/60 pt-5 text-sm text-muted-foreground lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-6">
            <p><span className="block font-heading text-base font-bold uppercase text-foreground">People first</span>Accessible learning for underserved communities.</p>
            <p><span className="block font-heading text-base font-bold uppercase text-foreground">Future ready</span>Skills connected to work and opportunity.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1fr)] lg:gap-20 lg:py-24">
        <SectionHeading eyebrow="Our story" title="Bridging education and work" />
        <div className="space-y-5 border-l border-border pl-5 text-muted-foreground sm:pl-8">
          <p>Skill Bridgeway Foundation works to expand access to practical, future-relevant skills and economic opportunities for young people and underserved communities.</p>
          <p>We work to bridge the gap between traditional education and the rapidly changing demands of the modern workforce. Our programmes focus on digital skills, artificial intelligence (AI) literacy, freelancing, entrepreneurship, and essential human-centred skills that enable individuals to adapt, participate and succeed in an increasingly technology-driven economy.</p>
          <p>With a particular focus on rural youth, madrasah students and communities with limited access to skills-development opportunities, we aim to create accessible pathways from learning to employment, self-employment and entrepreneurship.</p>
          <p>We believe technology should expand opportunity rather than deepen inequality. Through locally led programmes and partnerships with government institutions, development partners, educational institutions, civil society and the private sector, we seek to build practical skills, strengthen employability and support sustainable livelihoods across Bangladesh.</p>
        </div>
      </section>

      <section className="border-y bg-grid">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="border-l-2 border-primary bg-card/50 p-6 md:p-9">
            <Target className="h-8 w-8 text-primary" />
            <h2 className="section-title mt-4 text-lg">Our Mission</h2>
            <p className="mt-3 text-sm text-muted-foreground">To empower young people and underserved communities in Bangladesh with accessible, practical and future-relevant skills that improve employability, entrepreneurship and sustainable livelihood opportunities.</p>
            <p className="mt-3 text-sm text-muted-foreground">We pursue this mission through skills-development programmes in AI literacy, digital technologies, freelancing and entrepreneurship; locally accessible learning hubs; partnerships with public, private and development-sector organisations; and pathways connecting training with real-world economic opportunities.</p>
          </div>
          <div className="border-l-2 border-highlight bg-card/50 p-6 md:p-9">
            <Eye className="h-8 w-8 text-primary" />
            <h2 className="section-title mt-4 text-lg">Our Vision</h2>
            <p className="mt-3 text-sm text-muted-foreground">An inclusive and digitally empowered Bangladesh where every young person, regardless of background or location, has the skills, confidence and opportunities to participate meaningfully in the future of work and build a sustainable livelihood.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <SectionHeading eyebrow="What guides us" title="Core values" />
        <div className="mt-10 grid gap-x-8 md:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v, i) => (
            <div key={v.title} className="editorial-item border-t border-border py-7 transition-colors hover:border-primary">
              <div className="flex items-center justify-between"><v.icon className="h-7 w-7 text-primary" /><span className="font-mono text-xs text-muted-foreground">0{i + 1} / 07</span></div>
              <h3 className="mt-6 text-base uppercase">{v.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-grid">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
          <h2 className="section-title text-2xl">Join our next batch</h2>
           <Button asChild size="lg" className="bg-highlight text-highlight-foreground hover:bg-highlight/90"><Link to="/courses" search={{}}>Free Admission</Link></Button>
        </div>
      </section>
    </>
  );
}
