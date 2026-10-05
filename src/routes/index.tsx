import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, BookOpen, Bot, Briefcase, Building2, CalendarDays, GraduationCap, Handshake, HeartHandshake, Laptop, Megaphone, Quote, Rocket, ShieldCheck, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { seo } from "@/components/site/PageHero";
import { CardSkeletonGrid, CourseCard, EmptyState, SectionHeading } from "@/components/site/ui-bits";
import { BrandName } from "@/components/site/BrandName";
import { coursesQuery, formatDate, noticesQuery } from "@/lib/public-data";
import { whatsappChatLink } from "@/lib/site-info";
import workshop from "@/assets/learning-workshop.jpg";
import chairmanPortrait from "@/assets/md-saiful-azam-chairman.png.asset.json";

export const Route = createFileRoute("/")({ staticData: { sitemap: true },
  head: () => seo("Skill Bridgeway Foundation — AI, Digital & Freelancing Skills in Bangladesh", "Non-profit building AI literacy, digital, freelancing and entrepreneurship skills for rural youth, madrasah students and underserved communities in Bangladesh.", { path: "/" }),
  component: Index,
});

const PILLARS = [
  { icon: Bot, title: "AI Literacy", text: "Practical, responsible use of artificial intelligence for work and learning." },
  { icon: Briefcase, title: "Freelancing", text: "Build a profile, win clients and earn on global marketplaces." },
  { icon: Laptop, title: "Digital Skills", text: "Practical digital technology skills for today's workforce." },
  { icon: Rocket, title: "Entrepreneurship", text: "Pathways to self-employment and sustainable local enterprise." },
  { icon: HeartHandshake, title: "Human-Centred Skills", text: "Critical thinking, communication, creativity and problem-solving." },
];

const PARTNER_REASONS = [
  { icon: Handshake, title: "Social Impact & CSR", text: "Contribute directly to youth skill development and digital empowerment in Bangladesh." },
  { icon: Megaphone, title: "Brand Visibility", text: "Be recognized across our website, social media, training materials and events." },
  { icon: Users, title: "Access to Talent", text: "Connect with motivated, certified young professionals trained in AI and digital tools." },
  { icon: BookOpen, title: "Shape the Curriculum", text: "Co-design training modules aligned with your industry's needs." },
];

const PARTNER_TYPES = [
  { icon: GraduationCap, name: "Academic" },
  { icon: Wrench, name: "Technology" },
  { icon: Megaphone, name: "Media" },
  { icon: Building2, name: "Corporate" },
];


function Index() {
  const courses = useQuery(coursesQuery(3));
  const notices = useQuery(noticesQuery(4));

  return (
    <>
      <section className="relative isolate flex min-h-[610px] items-end overflow-hidden border-b sm:min-h-[660px]">
        <img src={workshop} alt="Young Bangladeshi learners working together on digital skills" width={1600} height={900} className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-background/75" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-24 sm:pb-16">
          <p className="editorial-kicker">RJSC-registered non-profit / Bangladesh</p>
          <h1 className="section-title mt-6 max-w-5xl text-4xl leading-tight sm:text-6xl lg:text-7xl"><BrandName /></h1>
          <p className="mt-6 max-w-2xl border-l border-primary pl-5 text-base leading-relaxed text-foreground sm:text-lg">Bridging the gap between traditional education and the modern workforce — practical AI literacy, digital, freelancing and entrepreneurship skills for rural youth, madrasah students and underserved communities.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="cta-shine bg-highlight text-highlight-foreground hover:bg-highlight/90"><Link to="/courses" search={{}}>Free Admission <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="cta-outline-glow border-primary bg-background/50 text-primary hover:bg-primary hover:text-primary-foreground"><Link to="/courses">Explore courses</Link></Button>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <SectionHeading eyebrow="What we teach" title="Skills for the future of work" />
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="editorial-item border-t border-border p-6 transition-colors hover:border-primary/60">
              <p.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </section>


      {/* Courses */}
      <section className="border-y bg-grid">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Courses" title="Featured programs" />
            <Link to="/courses" className="text-sm text-primary hover:underline">View all courses →</Link>
          </div>
          <div className="mt-10">
            {courses.isLoading ? <CardSkeletonGrid /> : courses.data?.length ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {courses.data.map((c) => <CourseCard key={c.id} c={c} />)}
              </div>
            ) : <EmptyState>New courses will be announced soon.</EmptyState>}
          </div>
        </div>
      </section>

      {/* Chairman's message */}
      <section className="relative overflow-hidden border-y bg-grid" aria-labelledby="chairman-message-title">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-border lg:block" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <div className="relative border-b border-border px-4 py-12 sm:px-8 sm:py-16 lg:border-b-0 lg:border-r lg:px-12 lg:py-24">
            <div className="lg:sticky lg:top-28">
              <p className="editorial-kicker">Leadership</p>
              <div className="relative mt-7 max-w-xl">
                <div className="absolute -left-3 -top-3 h-20 w-20 border-l border-t border-primary" aria-hidden="true" />
                <figure className="relative overflow-hidden border border-border bg-card">
                  <img
                    src={chairmanPortrait.url}
                    alt="Md Saiful Azam, Chairman of Skill Bridgeway Foundation"
                    width={768}
                    height={963}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover object-top"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 border-t border-border bg-background/90 px-5 py-4 backdrop-blur-md sm:px-6">
                    <p className="font-heading text-lg font-extrabold uppercase text-foreground">Md Saiful Azam</p>
                    <p className="mt-1 text-sm text-primary">Chairman · <BrandName className="font-semibold" /></p>
                  </figcaption>
                </figure>
                <div className="absolute -bottom-3 -right-3 h-20 w-20 border-b border-r border-highlight" aria-hidden="true" />
              </div>
            </div>
          </div>

          <article className="px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="editorial-kicker">From the Chairman</p>
                <h2 id="chairman-message-title" className="section-title mt-5 max-w-xl text-3xl leading-tight sm:text-4xl">Message from the Chairman</h2>
              </div>
              <Quote className="mt-1 hidden h-14 w-14 shrink-0 text-primary/25 sm:block" strokeWidth={1.25} aria-hidden="true" />
            </div>

            <div className="mt-8 space-y-5 text-[0.96rem] leading-8 text-muted-foreground sm:text-base">
              <p>I believe that the young people of Bangladesh have no shortage of talent or potential. What they need is the right guidance, opportunities for practical learning, and the confidence to put their abilities to use. Skill Bridgeway Foundation began its journey with this belief.</p>
              <p>Technology and artificial intelligence are changing how we learn and work. We want the opportunities arising from this change to reach beyond cities and privileged communities. Young people in rural areas, madrasah students, and underserved communities should also have the opportunity to develop the skills they need to build dignified livelihoods.</p>
              <p>Our goal is to create an effective bridge between education and working life. Through training in digital skills, AI literacy, freelancing, and entrepreneurship, we aim to build a learning environment where students develop the ability to solve real problems. Alongside these practical skills, we place importance on creativity, communication, ethics, and the responsible use of technology.</p>
              <p>For me, the success of this initiative goes beyond the number of training sessions delivered or certificates awarded. The true measure of our work will be how effectively learners apply their skills, how confident they become about their future, and how they contribute to their families and communities.</p>
              <p>I invite students, parents, trainers, development partners, and supporters to join us on this journey. We are committed to moving forward with transparency, accountability, and a clear focus on the quality of learning.</p>
              <p className="border-l-2 border-highlight pl-5 font-medium text-foreground">Together, let us create opportunities that allow each person’s future to be shaped by their potential rather than their limitations.</p>
            </div>

            <div className="mt-9 border-t border-border pt-6">
              <p className="font-heading text-lg font-extrabold uppercase text-foreground">Md Saiful Azam</p>
              <p className="mt-1 text-sm text-primary">Chairman</p>
              <BrandName className="text-sm font-semibold" />
            </div>
          </article>
        </div>
      </section>

      {/* Notices + verify */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-20 lg:grid-cols-[1.5fr_1fr]">
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="section-title text-xl">Latest notices</h2>
            <Link to="/notices" className="text-sm text-primary hover:underline">All →</Link>
          </div>
          <ul className="mt-6 divide-y">
            {notices.isLoading ? Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="space-y-2 py-4"><Skeleton className="h-4 w-2/3 bg-muted" /><Skeleton className="h-3 w-1/4 bg-muted" /></li>
            )) : notices.data?.length ? notices.data.map((n) => (
              <li key={n.id} className="flex gap-4 py-4">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <Link to="/notices/$slug" params={{ slug: n.slug }} className="font-medium hover:text-primary">{n.title}</Link>
                  <p className="text-xs text-muted-foreground">{n.type === "event" ? "Event" : "Notice"} · {formatDate(n.event_date ?? n.created_at)}</p>
                </div>
              </li>
            )) : <li className="py-4 text-sm text-muted-foreground">No notices yet.</li>}
          </ul>
        </div>
        <div className="glass flex flex-col justify-between rounded-xl p-6">
          <div>
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h2 className="section-title mt-4 text-xl">Verify a certificate</h2>
            <p className="mt-2 text-sm text-muted-foreground">Employers can confirm any Skill Bridgeway certificate instantly by serial number or QR code.</p>
          </div>
          <Button asChild className="mt-6 w-full"><Link to="/verify"><BadgeCheck className="mr-1 h-4 w-4" />Verify now</Link></Button>
        </div>
      </section>

      {/* Partner with us */}
      <section className="border-t bg-grid">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b pb-6">
            <div>
              <p className="editorial-kicker">Partner With Us / Sponsor Us</p>
              <h2 className="section-title mt-3 text-2xl sm:text-4xl">Empower the future together</h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">We invite forward-thinking organizations and individuals to partner with us — through sponsorship, empowerment programs and donations — to bridge the digital skills gap and build a future-ready generation.</p>
            </div>
            <Button asChild variant="outline"><Link to="/partner">Explore partnership <ArrowRight /></Link></Button>
          </div>

          <div className="grid gap-x-12 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNER_REASONS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="editorial-item border-b py-7">
                <span className="font-heading text-sm font-bold text-primary">0{i + 1}</span>
                <Icon className="mb-4 mt-3 h-6 w-6 text-primary" aria-hidden="true" />
                <h3 className="text-lg">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="glass rounded-xl p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-primary">Sponsorship opportunities</p>
                <p className="text-xs text-muted-foreground">Flexible packages · tailored to your capacity</p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {PARTNER_TIERS.filter((t) => t.students).map((t) => {
                  const top = t.id === "platinum";
                  return (
                    <div key={t.id} className={`relative flex flex-col rounded-lg border p-5 transition-all hover:-translate-y-1 ${top ? "border-highlight/60 bg-highlight/5 hover:shadow-[0_0_24px_-6px_hsl(var(--highlight)/0.5)]" : "hover:border-primary/60"}`}>
                      {top && <span className="absolute -top-2.5 left-4 rounded-full bg-highlight px-2 py-0.5 text-[10px] font-bold uppercase text-highlight-foreground">Top tier</span>}
                      <p className={`font-heading font-bold ${top ? "text-highlight" : "text-foreground"}`}>{t.label}</p>
                      <p className="mt-3 font-heading text-4xl font-extrabold text-foreground">{t.students}</p>
                      <p className="text-xs uppercase text-muted-foreground">students sponsored</p>
                      <ul className="mt-4 space-y-2 border-t pt-4">
                        {t.perks.map((perk) => <li key={perk} className="flex gap-2 text-xs leading-relaxed text-muted-foreground"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{perk}</li>)}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-xs font-semibold uppercase text-muted-foreground">Partnership types</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {PARTNER_TYPES.map(({ icon: Icon, name }) => (
                  <span key={name} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary"><Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />{name}</span>
                ))}
              </div>
            </div>
            <div className="glass flex flex-col justify-between rounded-xl p-6 sm:p-8">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">Ready to make a difference?</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Become a partner, sponsor a student's learning journey, or support us with a donation. Let's discuss how we can create a lasting impact together.</p>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <Button asChild className="bg-highlight text-highlight-foreground hover:bg-highlight/90"><a href={whatsappChatLink("Hello Skill Bridgeway Foundation! I'd like to learn more about becoming a partner or sponsoring your programs.")} target="_blank" rel="noopener noreferrer">Become a Partner <ArrowRight /></a></Button>
                <Button asChild variant="outline"><Link to="/contact">Contact Us for Details</Link></Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-grid">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
          <h2 className="section-title text-2xl md:text-3xl">Ready to cross the <span className="text-highlight">bridge</span>?</h2>
          <Button asChild size="lg" className="bg-highlight text-highlight-foreground hover:bg-highlight/90">
             <Link to="/courses" search={{}}>Free Admission</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
