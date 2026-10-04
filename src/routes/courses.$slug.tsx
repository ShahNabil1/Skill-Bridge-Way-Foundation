import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BarChart3, Clock, Share2, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { seo } from "@/components/site/PageHero";
import { CourseCard, CardSkeletonGrid, EmptyState } from "@/components/site/ui-bits";
import { CourseMedia, EnrollGate, RichContent } from "@/components/site/CourseMedia";
import { durationLabel, imagesOf, plainText } from "@/lib/course-content";
import { courseQuery, coursesQuery, isPreviewOnlyCourse, mediaUrl, TEST_ENROLLMENT_SLUG } from "@/lib/public-data";
import { PROGRAM } from "@/lib/program-pathway";

export const Route = createFileRoute("/courses/$slug")({ staticData: { sitemap: true },
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(courseQuery(params.slug));
    } catch {
      return null; // the page itself shows a friendly fallback
    }
  },
  head: ({ params, loaderData: c }) => {
    const name = c?.title ?? params.slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    const desc = (c?.summary || plainText(c?.description) || `Free ${name} course by Skill Bridgeway Foundation — details, duration and free admission.`).slice(0, 160);
    const base = seo(`${name} | Skill Bridgeway Foundation`, desc, {
      path: `/courses/${params.slug}`,
      image: mediaUrl(c?.cover_image_key),
      type: "article",
      noindex: c === null || params.slug.startsWith("demo-"),
    });
    if (!c) return base;
    const image = mediaUrl(c.cover_image_key);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Course",
      name: c.title,
      description: desc,
      url: `https://skillbridgeway.org/courses/${params.slug}`,
      ...(image ? { image } : {}),
      provider: { "@type": "Organization", name: "Skill Bridgeway Foundation", sameAs: "https://skillbridgeway.org" },
    };
    return { ...base, scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }] };
  },
  component: CourseDetails,
});

function CourseDetails() {
  const { slug } = Route.useParams();
  const c = Route.useLoaderData();
  const related = useQuery(coursesQuery());

  async function shareCourse(title: string) {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} | Skill Bridgeway Foundation`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Course link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share this course. Please copy the page address instead.");
    }
  }

  if (!c) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <EmptyState>This course could not be found. <Link to="/courses" className="text-primary hover:underline">Browse all courses</Link></EmptyState>
      </div>
    );
  }
  const previewOnly = isPreviewOnlyCourse(c.slug);
  const isTestCourse = c.slug === TEST_ENROLLMENT_SLUG;
  const otherCourses = (related.data ?? []).filter((course) => course.id !== c.id).slice(0, 3);
  const journeyIndex = PROGRAM.findIndex((course) => course.slug === c.slug);
  const nextCourse = journeyIndex >= 0 ? PROGRAM[journeyIndex + 1] : undefined;
  return (
    <>
       <section className="page-intro bg-grid border-b">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />All courses</Link>
           {journeyIndex >= 0 && <p className="editorial-kicker mt-5">75-day learning journey / Segment {PROGRAM[journeyIndex]?.segment === 1 ? "01 — Foundation" : "02 — Practical"} / Course {PROGRAM[journeyIndex]?.number} of 04</p>}
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <h1 className="section-title text-3xl md:text-5xl">{c.title}</h1>
            <Button variant="outline" onClick={() => shareCourse(c.title)} aria-label={`Share ${c.title}`}><Share2 className="h-4 w-4" /> Share</Button>
          </div>
          {c.summary && <p className="mt-4 max-w-2xl text-muted-foreground">{c.summary}</p>}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_340px]">
        <article className="min-w-0">
          <CourseMedia images={imagesOf(c)} video={c.video_url} title={c.title} />
          <h2 className="section-title text-xl">Course overview</h2>
          <RichContent html={c.description} className="mt-4" />
           {nextCourse && <div className="mt-10 border-t border-primary pt-6"><p className="text-xs font-bold uppercase text-primary">Next in your learning journey</p><Link to="/courses/$slug" params={{ slug: nextCourse.slug }} className="mt-3 inline-flex items-center gap-2 text-lg font-semibold hover:text-primary">{nextCourse.number} / {nextCourse.title}<ArrowRight className="h-5 w-5 shrink-0" /></Link></div>}
        </article>
         <aside className="glass h-fit space-y-4 rounded-md border-t-2 border-t-primary p-6 lg:sticky lg:top-24">
          <p className="font-heading text-3xl font-extrabold text-primary">{previewOnly ? "PREVIEW" : "FREE"}</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {c.category && <li className="flex gap-2"><Tag className="h-4 w-4 text-primary" />{c.category}</li>}
            {durationLabel(c.duration_value, c.duration_unit, c.duration) && <li className="flex gap-2"><Clock className="h-4 w-4 text-primary" />{durationLabel(c.duration_value, c.duration_unit, c.duration)}</li>}
            {c.level && <li className="flex gap-2"><BarChart3 className="h-4 w-4 text-primary" />{c.level}</li>}
          </ul>
           {previewOnly ? <p className="border-t pt-4 text-sm text-muted-foreground">Preview program only. Enrollment is not open for this sample course.</p> : <><EnrollGate start={c.apply_start} end={c.apply_end}><Button asChild size="lg" className="w-full bg-highlight text-highlight-foreground hover:bg-highlight/90"><Link to="/admission" search={{ course: c.id }}>Free Admission</Link></Button></EnrollGate>{isTestCourse && <p className="text-xs text-muted-foreground">Demo course · test applications only. Not a live training intake.</p>}</>}
        </aside>
      </section>
      <section className="border-t bg-grid py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="section-title text-xl md:text-2xl">Explore more courses</h2>
            <Link to="/courses" className="shrink-0 text-sm text-primary hover:underline">All courses</Link>
          </div>
          {related.isLoading ? <CardSkeletonGrid /> : otherCourses.length > 0 ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{otherCourses.map((course) => <CourseCard key={course.id} c={course} />)}</div> : <EmptyState>No other courses available yet.</EmptyState>}
        </div>
      </section>
    </>
  );
}
