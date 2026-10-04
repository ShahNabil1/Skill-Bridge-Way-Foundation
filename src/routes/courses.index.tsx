import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, BookOpen, Clock3, CalendarDays, Sparkles, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seo } from "@/components/site/PageHero";
import { PROGRAM } from "@/lib/program-pathway";
import workshop from "@/assets/digital-skills-program.jpg";

export const Route = createFileRoute("/courses/")({ staticData: { sitemap: true },
  head: () => {
    const base = seo("AI & Digital Skills Courses | Skill Bridgeway Foundation", "Learn practical AI, digital, creative and technology skills through a beginner-friendly, project-based 75-day program at Skill Bridgeway Foundation.", { path: "/courses" });
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: PROGRAM.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://skillbridgeway.org/courses/${c.slug}`,
        item: {
          "@type": "Course",
          name: c.title,
          description: c.purpose,
          url: `https://skillbridgeway.org/courses/${c.slug}`,
          provider: { "@type": "Organization", name: "Skill Bridgeway Foundation", sameAs: "https://skillbridgeway.org" },
        },
      })),
    };
    return { ...base, scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }] };
  },
  component: Courses,
});

const FACTS = [
  { label: "Duration", value: "75 Days", icon: CalendarDays },
  { label: "Class Duration", value: "2 Hours per Class", icon: Clock3 },
  { label: "Classes", value: "4 Classes per Week", icon: BookOpen },
  { label: "Learning Method", value: "Practical • Project-Based • Beginner-Friendly", icon: Sparkles },
];
const SEGMENTS = [
  { number: "01", name: "Digital Foundation & Professional Development", label: "NON-SKILL / FOUNDATION", description: "This segment is designed especially for beginners and young people who have limited experience using computers and digital technology. Learners first develop confidence, communication, problem-solving and responsible digital habits before moving into advanced practical skills." },
  { number: "02", name: "Technical Skills & Project Development", label: "SKILL / PRACTICAL", description: "Learners now apply their digital foundation to real-world AI, creative technology and digital projects." },
] as const;
const ACHIEVEMENTS = [
  ["CREATE", "Produce a complete 5–10 minute AI-assisted video."],
  ["BUILD", "Build and demonstrate a useful app or digital tool."],
  ["DEVELOP", "Complete a practical website or digital marketing project."],
  ["AUTOMATE", "Use AI and automation workflows for everyday tasks and small-business needs."],
  ["PRESENT", "Explain, demonstrate and document their own project."],
  ["PORTFOLIO", "Build a practical portfolio showing their completed work."],
] as const;
const AUDIENCE = ["Young people with limited digital experience", "Beginners who want to learn computer and digital skills", "Students and recent graduates", "Rural and underserved learners", "Young people interested in AI and technology", "Future freelancers", "Aspiring digital entrepreneurs", "Learners who want practical, employment-oriented skills"];
const METHOD = [
  ["LEARN", "Understand the concept in simple language."], ["PRACTICE", "Apply the skill through guided exercises."],
  ["CREATE", "Build something practical."], ["TEST", "Check, improve and troubleshoot the work."],
  ["PRESENT", "Explain and demonstrate the project."], ["PORTFOLIO", "Document the completed work for future opportunities."],
] as const;
const SAFETY = ["Verify AI-generated information", "Protect personal information", "Use third-party content responsibly", "Understand AI limitations", "Avoid blindly trusting AI outputs", "Respect copyright and content ownership", "Use AI ethically and responsibly"];

function Courses() {
  return (
    <>
      <section className="page-intro relative isolate overflow-hidden border-b">
        <img src={workshop} alt="Bangladeshi learners practising digital skills together in a classroom" width={1600} height={900} className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-background/85" />
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <p className="editorial-kicker">Free admission / 75-day practical program</p>
          <h1 className="section-title mt-5 max-w-5xl text-4xl leading-tight md:text-6xl">AI-Powered Digital Skills &amp; Career Development Program</h1>
          <p className="mt-6 max-w-3xl border-l border-primary pl-5 text-lg text-foreground">A practical, project-based 75-day learning program designed to take young people from basic digital confidence to AI-powered creative, technical and career-ready skills.</p>
          <div className="mt-7 flex flex-wrap items-center gap-4"><span className="border border-primary bg-primary/15 px-3 py-1 text-xs font-bold text-primary">BEGINNER FRIENDLY</span><span className="text-sm font-semibold">No Advanced Digital Skills Required</span></div>
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground">This program starts from basic digital skills and gradually progresses toward AI tools, video production, app development, website development and digital marketing.</p>
        </div>
      </section>
      <section aria-label="Program at a glance" className="border-b">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border px-4 sm:grid-cols-4">
          {FACTS.map((fact) => <div key={fact.label} className="min-w-0 bg-background px-3 py-6 sm:px-6"><fact.icon className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-xs uppercase text-muted-foreground">{fact.label}</p><p className="mt-1 text-sm font-semibold leading-snug sm:text-base">{fact.value}</p></div>)}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <p className="editorial-kicker">The pathway</p>
        <h2 className="section-title mt-3 text-3xl md:text-4xl">Your Learning Journey</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">Learners progress step-by-step. We begin with digital confidence and professional foundations before moving into practical AI and technology projects.</p>
        <ol className="mt-9 grid gap-3 md:grid-cols-4">
          {PROGRAM.map((course, i) => <li key={course.slug} className="relative min-w-0 border-t-2 border-primary bg-card p-5 md:min-h-48">
            <p className="font-heading text-3xl font-extrabold text-primary">{course.number}</p><h3 className="mt-4 text-base leading-snug">{course.title}</h3>
            {i < 3 && <ArrowRight aria-hidden="true" className="absolute -right-4 top-6 z-10 hidden h-7 w-7 rounded-full bg-background p-1 text-highlight md:block" />}
            {i < 3 && <ArrowDown aria-hidden="true" className="mx-auto mt-4 h-5 w-5 text-highlight md:hidden" />}
          </li>)}
        </ol>
        <p className="mt-5 text-sm text-muted-foreground">Beginner → Digital Confidence → AI Readiness → Creative Skills → Technical Skills → Real Project → Portfolio</p>
      </section>
      <div className="border-t bg-grid">
        {SEGMENTS.map((segment, segmentIndex) => <section key={segment.number} className="mx-auto max-w-7xl px-4 py-16 md:py-20" aria-labelledby={`segment-${segment.number}`}>
          <div className="grid gap-6 border-b border-primary/40 pb-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div><p className="editorial-kicker">Segment {segment.number} / {segment.label}</p><h2 id={`segment-${segment.number}`} className="section-title mt-4 text-3xl md:text-4xl">{segment.name}</h2></div>
            <p className="self-end text-muted-foreground">{segment.description}</p>
          </div>
          <ol className="relative mt-10 space-y-10 border-l border-primary/50 pl-6 md:pl-10">
            {PROGRAM.filter((course) => course.segment === segmentIndex + 1).map((course, index) => <li key={course.slug} className="relative">
              <span aria-hidden="true" className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background md:-left-[47px]" />
              <div className="grid min-w-0 gap-6 border-t border-border pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div className="min-w-0"><p className="text-xs font-bold uppercase text-primary">Course {course.number} / {course.level}</p><h3 className="mt-3 text-xl leading-tight md:text-2xl">{course.title}</h3><p className="mt-4 text-muted-foreground">{course.purpose}</p>
                  <p className="mt-5 text-xs font-bold uppercase text-primary">Practical project</p><p className="mt-1 text-sm text-foreground">{course.project}</p>
                  <p className="mt-5 text-xs font-bold uppercase text-primary">Learner outcome</p><p className="mt-1 text-sm text-muted-foreground">{course.outcome}</p>
                  <Button asChild variant="outline" className="mt-6"><Link to="/courses/$slug" params={{ slug: course.slug }}>View Details <ArrowRight className="h-4 w-4" /></Link></Button>
                </div>
                <div className="min-w-0 bg-card p-5 sm:p-6"><h4 className="font-heading text-sm font-bold uppercase">Main topics</h4><ul className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">{course.topics.map((topic, topicIndex) => <li key={`${topic}-${topicIndex}`} className="flex gap-2 text-sm text-muted-foreground"><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{topic}</li>)}</ul></div>
              </div>
              {index === 0 && <ArrowDown aria-hidden="true" className="mt-8 h-5 w-5 text-highlight" />}
            </li>)}
          </ol>
          {segmentIndex === 0 && <div className="mt-10 flex items-center gap-3 border-t border-border pt-7 text-sm font-semibold text-highlight"><ArrowDown className="h-5 w-5" /> Next: Practical skills &amp; real projects</div>}
        </section>)}
      </div>
      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20"><p className="editorial-kicker">Tangible results</p><h2 className="section-title mt-3 text-3xl md:text-4xl">What Will Learners Achieve?</h2><div className="mt-9 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">{ACHIEVEMENTS.map(([title, text], i) => <div key={title} className="bg-background p-6"><span className="text-xs text-primary">0{i + 1} / 06</span><h3 className="mt-3 text-lg">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>)}</div></section>
      <section className="border-y bg-grid"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:py-20"><div><p className="editorial-kicker">Open to beginners</p><h2 className="section-title mt-3 text-3xl md:text-4xl">Who Is This Program For?</h2><div className="mt-8 border-l-2 border-highlight pl-5"><h3 className="text-lg">You Do Not Need to Be a Technology Expert</h3><p className="mt-2 text-sm text-muted-foreground">We start from the basics and gradually build your skills through practical exercises and real projects.</p></div></div><ul className="grid gap-3 sm:grid-cols-2">{AUDIENCE.map((item) => <li key={item} className="flex items-start gap-3 border-t border-border pt-3 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}</ul></div></section>
      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20"><p className="editorial-kicker">Our method</p><h2 className="section-title mt-3 text-3xl md:text-4xl">How We Teach</h2><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{METHOD.map(([title, text], i) => <div key={title} className="border-t border-primary p-5"><span className="text-xs text-primary">0{i + 1} / 06</span><h3 className="mt-3 text-lg">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>)}</div></section>
      <section className="border-y bg-grid"><div className="mx-auto max-w-7xl px-4 py-16 md:py-20"><p className="editorial-kicker">Project-based learning</p><h2 className="section-title mt-3 text-3xl md:text-4xl">Learn by Doing</h2><p className="mt-4 max-w-3xl text-muted-foreground">This is not a lecture-only program. Learners spend a significant part of their training practising tools, creating content, solving problems and developing real projects.</p><ol className="mt-8 flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">{["Practice", "Project", "Test", "Improve", "Present", "Portfolio"].map((step, index) => <li key={step} className="flex items-center gap-2"><span className="border border-primary/50 px-3 py-2">{step}</span>{index < 5 && <ArrowRight className="h-4 w-4 text-highlight" aria-hidden="true" />}</li>)}</ol></div></section>
      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20"><ShieldCheck className="h-8 w-8 text-primary" aria-hidden="true" /><h2 className="section-title mt-3 text-3xl md:text-4xl">Responsible &amp; Safe Use of AI</h2><p className="mt-3 text-muted-foreground">Learners will also learn how to:</p><ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{SAFETY.map((item) => <li key={item} className="flex items-start gap-3 border-t border-border pt-4 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}</ul></section>
      <section className="border-t bg-grid"><div className="mx-auto max-w-7xl px-4 py-16 md:py-20"><p className="editorial-kicker">Free admission</p><h2 className="section-title mt-3 text-3xl md:text-4xl">Ready to Build Your Future Skills?</h2><p className="mt-4 max-w-2xl text-muted-foreground">Start with the basics. Learn practical digital skills. Create with AI. Build real projects. Prepare for future opportunities.</p><p className="mt-3 text-sm text-foreground">Start from the basics. Build digital confidence. Learn AI. Create real projects. Develop practical skills. Build your portfolio.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg" className="bg-highlight text-highlight-foreground hover:bg-highlight/90"><Link to="/courses/$slug" params={{ slug: PROGRAM[0].slug }}>APPLY FREE <ArrowRight className="h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/contact">CONTACT US</Link></Button></div></div></section>
    </>
  );
}
