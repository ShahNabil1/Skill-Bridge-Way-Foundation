import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Building2, GraduationCap, Handshake, Mail, MapPin, Megaphone, MessageCircle, Sparkles, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seo } from "@/components/site/PageHero";
import { SocialLinks } from "@/components/site/SocialLinks";
import { BrandName } from "@/components/site/BrandName";
import { whatsappChatLink } from "@/lib/site-info";
import workshop from "@/assets/partner-workshop.jpg";

export const Route = createFileRoute("/partner")({
  staticData: { sitemap: true },
  head: () => seo(
    "Partner With Us / Sponsor Us | Skill Bridgeway Foundation",
    "Partner with Skill Bridgeway Foundation to support youth skill development in Bangladesh. Explore sponsorship and academic, technology, media and corporate partnerships.",
    { path: "/partner" },
  ),
  component: PartnerPage,
});

const reasons = [
  { icon: Handshake, title: "Social Impact & CSR", text: "Fulfill your Corporate Social Responsibility by directly contributing to youth skill development and digital empowerment in Bangladesh." },
  { icon: Megaphone, title: "Brand Visibility", text: "Get your brand recognized across our website, social media platforms, training materials, and future events." },
  { icon: Users, title: "Access to Talent", text: "Connect with a pool of highly motivated, skilled, and certified young professionals trained in modern AI and digital tools." },
  { icon: BookOpen, title: "Shape the Curriculum", text: "Collaborate with us to design training modules that align with your industry's specific needs." },
];

const tiers = [
  { rank: "01", name: "Platinum Partner", detail: "Title sponsorship, prominent logo placement, and full scholarship sponsorship for 50 students.", count: "50 students", emphasis: true },
  { rank: "02", name: "Gold Partner", detail: "Logo placement on our website, social media recognition, and scholarship sponsorship for 20 students.", count: "20 students", emphasis: false },
  { rank: "03", name: "Silver Partner", detail: "Website recognition and scholarship sponsorship for 5 students.", count: "5 students", emphasis: false },
];

const partnerTypes = [
  { icon: GraduationCap, name: "Academic Partners", detail: "Schools, Colleges, and Universities." },
  { icon: Wrench, name: "Technology Partners", detail: "Software companies and AI tool providers." },
  { icon: Megaphone, name: "Media Partners", detail: "News portals and online influencers." },
  { icon: Building2, name: "Corporate Partners", detail: "Companies looking to train their existing workforce." },
];

const partnerEmail = "mailto:info@skillbridgeway.org?subject=Partnership%20enquiry%20%E2%80%94%20Skill%20Bridgeway%20Foundation";

function PartnerPage() {
  return (
    <>
      <section className="relative isolate flex min-h-[570px] items-end overflow-hidden border-b sm:min-h-[620px] lg:min-h-[660px]">
        <img src={workshop} alt="Young learners collaborating around laptops in a digital skills workshop" width={1600} height={1000} className="absolute inset-0 -z-20 h-full w-full object-cover object-[60%_center]" />
        <div className="absolute inset-0 -z-10 bg-background/65 lg:bg-background/55" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-32 sm:pb-20 lg:pb-24">
          <p className="editorial-kicker mb-5">Partner With Us / Sponsor Us</p>
          <h1 className="max-w-4xl text-3xl font-extrabold uppercase leading-tight text-foreground sm:text-5xl lg:text-6xl">Empower the Future: Partner with <BrandName /></h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-foreground sm:text-lg">We are an emerging start-up on a mission to equip young career aspirants in Bangladesh with essential AI literacy and advanced digital marketing skills. As we begin our journey, we invite forward-thinking organizations and individuals to partner with us. Together, we can bridge the digital skills gap and build a future-ready generation.</p>
          <Button asChild size="lg" className="mt-8 bg-highlight text-highlight-foreground hover:bg-highlight/90"><a href={partnerEmail}>Become a Partner <ArrowRight /></a></Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <div className="mb-10 flex items-end justify-between gap-6 border-b pb-6">
          <div><p className="text-xs font-semibold uppercase text-primary">The opportunity</p><h2 className="mt-2 text-2xl sm:text-4xl">Why Partner With Us?</h2></div>
          <Sparkles className="hidden h-9 w-9 text-primary sm:block" aria-hidden="true" />
        </div>
        <div className="grid gap-x-12 sm:grid-cols-2">
          {reasons.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="editorial-item flex gap-5 border-b py-7 sm:py-9">
              <span className="font-heading text-sm font-bold text-primary">0{i + 1}</span>
              <div><Icon className="mb-4 h-6 w-6 text-primary" aria-hidden="true" /><h3 className="text-lg">{title}</h3><p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-grid">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <p className="text-xs font-semibold uppercase text-primary">Make an impact</p>
          <h2 className="mt-2 text-2xl sm:text-4xl">Sponsorship Opportunities</h2>
          <p className="mt-4 text-muted-foreground">We offer flexible sponsorship packages tailored to your organization's capacity.</p>
          <div className="mt-10 divide-y border-y">
            {tiers.map((tier) => (
              <div key={tier.name} className="editorial-item grid gap-4 py-7 md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1.5fr)_8rem] md:items-center md:gap-8">
                <span className="font-heading text-sm font-bold text-primary">{tier.rank}</span>
                <h3 className={`text-xl sm:text-2xl ${tier.emphasis ? "text-highlight" : "text-foreground"}`}>{tier.name}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{tier.detail}</p>
                <span className="text-sm font-semibold text-primary md:text-right">{tier.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase text-primary">Work together</p>
        <h2 className="mt-2 text-2xl sm:text-4xl">Partnership Opportunities</h2>
        <p className="mt-4 text-muted-foreground">We are open to diverse collaborations:</p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {partnerTypes.map(({ icon: Icon, name, detail }) => (
            <div key={name} className="editorial-item bg-background p-6 sm:p-7">
              <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
              <h3 className="mt-7 text-base">{name}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-grid">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Let's connect</p>
            <h2 className="mt-3 text-3xl sm:text-5xl">Ready to make a difference?</h2>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">Let's discuss how we can work together to create a lasting impact.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-highlight text-highlight-foreground hover:bg-highlight/90"><a href={partnerEmail}>Become a Partner <ArrowRight /></a></Button>
              <Button asChild size="lg" variant="outline"><Link to="/contact">Contact Us for Details</Link></Button>
            </div>
          </div>
          <address className="not-italic lg:border-l lg:pl-12">
            <p className="mb-6 text-xs font-semibold uppercase text-primary">Contact Us</p>
            <a className="flex items-start gap-4 py-3 text-foreground hover:text-primary" href="mailto:info@skillbridgeway.org"><Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />info@skillbridgeway.org</a>
            <a className="flex items-start gap-4 py-3 text-foreground hover:text-primary" href="https://wa.me/8801717224952" target="_blank" rel="noopener noreferrer"><MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />WhatsApp: 01717224952</a>
            <p className="flex items-start gap-4 py-3 text-foreground"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />Bogura, Bangladesh</p>
             <div className="mt-5"><SocialLinks /></div>
          </address>
        </div>
      </section>
    </>
  );
}