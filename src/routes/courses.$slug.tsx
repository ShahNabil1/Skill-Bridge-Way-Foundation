import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Clock, Share2, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { seo } from "@/components/site/PageHero";
import { CourseCard, CardSkeletonGrid, EmptyState } from "@/components/site/ui-bits";
import { courseQuery, coursesQuery, isPreviewOnlyCourse, mediaUrl, TEST_ENROLLMENT_SLUG } from "@/lib/public-data";

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
    const desc = (c?.summary || c?.description || `Free ${name} course by Skill Bridgeway Foundation — details, duration and free admission.`).slice(0, 160);
    return seo(`${name} | Skill Bridgeway Foundation`, desc, {
      path: `/courses/${params.slug}`,
      image: mediaUrl(c?.cover_image_key),
      type: "article",
      noindex: c === null || params.slug.startsWith("demo-"),
    });
  },
  component: CourseDetails,
});

function CourseDetails() {
  const { slug } = Route.useParams();
  const { data: c, isLoading } = useQuery(courseQuery(slug));
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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-16">
        <Skeleton className="h-4 w-24 bg-muted" /><Skeleton className="h-12 w-2/3 bg-muted" /><Skeleton className="h-64 w-full bg-muted" />
      </div>
    );
  }
  if (!c) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <EmptyState>This course could not be found. <Link to="/courses" className="text-primary hover:underline">Browse all courses</Link></EmptyState>
      </div>
    );
  }
  const img = mediaUrl(c.cover_image_key);
  const previewOnly = isPreviewOnlyCourse(c.slug);
  const isTestCourse = c.slug === TEST_ENROLLMENT_SLUG;
  const otherCourses = (related.data ?? []).filter((course) => course.id !== c.id).slice(0, 3);
  return (
    <>
      <section className="bg-grid border-b">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />All courses</Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <h1 className="section-title text-3xl md:text-5xl">{c.title}</h1>
            <Button variant="outline" onClick={() => shareCourse(c.title)} aria-label={`Share ${c.title}`}><Share2 className="h-4 w-4" /> Share</Button>
          </div>
          {c.summary && <p className="mt-4 max-w-2xl text-muted-foreground">{c.summary}</p>}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_340px]">
        <article className="min-w-0">
          {img && <img src={img} alt={c.title} className="mb-8 aspect-video w-full rounded-xl border object-cover" />}
          <h2 className="section-title text-xl">Course overview</h2>
          <div className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{c.description || "Full course details coming soon."}</div>
        </article>
        <aside className="glass h-fit space-y-4 rounded-xl p-6 lg:sticky lg:top-24">
          <p className="font-heading text-3xl font-extrabold text-primary">{previewOnly ? "PREVIEW" : "FREE"}</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {c.category && <li className="flex gap-2"><Tag className="h-4 w-4 text-primary" />{c.category}</li>}
            {c.duration && <li className="flex gap-2"><Clock className="h-4 w-4 text-primary" />{c.duration}</li>}
            {c.level && <li className="flex gap-2"><BarChart3 className="h-4 w-4 text-primary" />{c.level}</li>}
          </ul>
          {previewOnly ? <p className="border-t pt-4 text-sm text-muted-foreground">Preview program only. Enrollment is not open for this sample course.</p> : <><Button asChild size="lg" className="w-full bg-highlight text-highlight-foreground hover:bg-highlight/90"><Link to="/admission" search={isTestCourse ? { course: c.id } : undefined}>Free Admission</Link></Button>{isTestCourse && <p className="text-xs text-muted-foreground">Demo course · test applications only. Not a live training intake.</p>}</>}
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
