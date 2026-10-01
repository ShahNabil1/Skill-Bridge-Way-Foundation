import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { seo } from "@/components/site/PageHero";
import { EmptyState } from "@/components/site/ui-bits";
import { courseQuery, mediaUrl } from "@/lib/public-data";

export const Route = createFileRoute("/courses/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    return seo(`${name} | Skill Bridgeway Foundation`, `Free ${name} course by Skill Bridgeway Foundation — details, duration and free admission.`);
  },
  component: CourseDetails,
});

function CourseDetails() {
  const { slug } = Route.useParams();
  const { data: c, isLoading } = useQuery(courseQuery(slug));

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
  return (
    <>
      <section className="bg-grid border-b">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />All courses</Link>
          <h1 className="section-title mt-4 text-3xl md:text-5xl">{c.title}</h1>
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
          <p className="font-heading text-3xl font-extrabold text-primary">FREE</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {c.category && <li className="flex gap-2"><Tag className="h-4 w-4 text-primary" />{c.category}</li>}
            {c.duration && <li className="flex gap-2"><Clock className="h-4 w-4 text-primary" />{c.duration}</li>}
            {c.level && <li className="flex gap-2"><BarChart3 className="h-4 w-4 text-primary" />{c.level}</li>}
          </ul>
          <Button asChild size="lg" className="w-full bg-highlight text-highlight-foreground hover:bg-highlight/90"><Link to="/admission">Free Admission</Link></Button>
        </aside>
      </section>
    </>
  );
}
