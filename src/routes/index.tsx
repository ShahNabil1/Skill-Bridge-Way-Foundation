import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Bot, Briefcase, CalendarDays, Laptop, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { seo } from "@/components/site/PageHero";
import { CardSkeletonGrid, CourseCard, EmptyState, SectionHeading } from "@/components/site/ui-bits";
import { coursesQuery, formatDate, noticesQuery } from "@/lib/public-data";
import logo from "@/assets/sbf-logo.jpeg.asset.json";

export const Route = createFileRoute("/")({ staticData: { sitemap: true },
  head: () => seo("Skill Bridgeway Foundation — Free AI & Digital Skills in Bangladesh", "Free training in AI, freelancing and digital skills for young people across Bangladesh. Apply for free admission today.", { path: "/" }),
  component: Index,
});

const PILLARS = [
  { icon: Bot, title: "Artificial Intelligence", text: "Practical AI tools, prompting and automation for real work." },
  { icon: Briefcase, title: "Freelancing", text: "Build a profile, win clients and earn on global marketplaces." },
  { icon: Laptop, title: "Digital Skills", text: "Design, web, marketing and office skills employers need." },
];

const STEPS = [
  { n: "01", title: "Apply free", text: "Fill in the online admission form — no fees, ever." },
  { n: "02", title: "Get your Student ID", text: "Approved learners receive a unique Student ID." },
  { n: "03", title: "Learn by doing", text: "Mentor-led, project-based classes." },
  { n: "04", title: "Earn a verified certificate", text: "Every certificate carries a QR code anyone can verify." },
];

function Index() {
  const courses = useQuery(coursesQuery(3));
  const notices = useQuery(noticesQuery(4));

  return (
    <>
      {/* Hero */}
      <section className="bg-grid relative overflow-hidden border-b">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 md:py-28 lg:grid-cols-[1.3fr_1fr]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-highlight" /> Non-profit · Bangladesh
            </p>
            <h1 className="section-title mt-6 text-4xl leading-[1.05] sm:text-5xl md:text-6xl">
              Where human talent meets <span className="text-primary">AI</span> <span className="text-highlight">opportunity</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-light text-muted-foreground">
              Free, practical training in AI, freelancing and digital skills — with certificates anyone can verify.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-highlight text-highlight-foreground hover:bg-highlight/90">
                <Link to="/admission">Free Admission <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground">
                <Link to="/courses">Explore courses</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="glass rounded-3xl p-6">
              <img src={logo.url} alt="Skill Bridgeway Foundation emblem" width={400} height={400} className="w-full rounded-full" />
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[["100%", "Free"], ["QR", "Verified"], ["BD", "Nationwide"]].map(([a, b]) => (
                  <div key={b} className="rounded-lg border p-3">
                    <p className="font-heading text-lg font-extrabold text-primary">{a}</p>
                    <p className="text-xs text-muted-foreground">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <SectionHeading eyebrow="What we teach" title="Three bridges to the future" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="glass rounded-xl p-6 transition-colors hover:border-primary/60">
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

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <SectionHeading eyebrow="Your journey" title="How it works" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-xl border p-6">
              <span className="font-heading text-4xl font-extrabold text-primary/30">{s.n}</span>
              <h3 className="mt-2 text-base uppercase">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
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
                  <p className="font-medium">{n.title}</p>
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

      {/* CTA */}
      <section className="border-t bg-grid">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
          <h2 className="section-title text-2xl md:text-3xl">Ready to cross the <span className="text-highlight">bridge</span>?</h2>
          <Button asChild size="lg" className="bg-highlight text-highlight-foreground hover:bg-highlight/90">
            <Link to="/admission">Free Admission</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
