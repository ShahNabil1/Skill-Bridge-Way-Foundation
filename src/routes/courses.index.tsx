import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHero, seo } from "@/components/site/PageHero";
import { CardSkeletonGrid, CourseCard, EmptyState } from "@/components/site/ui-bits";
import { coursesQuery } from "@/lib/public-data";

export const Route = createFileRoute("/courses/")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined; category?: string | undefined } => ({
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
    category: typeof s["category"] === "string" && s["category"] ? s["category"] : undefined,
  }),
  head: () => seo("Courses | Skill Bridgeway Foundation", "Browse free courses in AI, freelancing and digital skills."),
  component: Courses,
});

function Courses() {
  const { q = "", category = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/courses/" });
  const { data, isLoading } = useQuery(coursesQuery());
  const categories = Array.from(new Set((data ?? []).map((c) => c.category).filter(Boolean))) as string[];
  const filtered = (data ?? []).filter(
    (c) => (!category || c.category === category) && (!q || `${c.title} ${c.summary ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      <PageHero eyebrow="Learn for free" title="Courses">Every course is 100% free and ends with a verifiable certificate.</PageHero>
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} placeholder="Search courses" className="pl-9" onChange={(e) => navigate({ search: (p) => ({ ...p, q: e.target.value || undefined }), replace: true })} />
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {["", ...categories].map((cat) => (
                <button key={cat || "all"} onClick={() => navigate({ search: (p) => ({ ...p, category: cat || undefined }) })}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${category === cat ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary hover:text-primary"}`}>
                  {cat || "All"}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-10">
          {isLoading ? <CardSkeletonGrid count={6} /> : filtered.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((c) => <CourseCard key={c.id} c={c} />)}</div>
          ) : <EmptyState>{data?.length ? "No courses match your search." : "New courses will be announced soon."}</EmptyState>}
        </div>
      </section>
    </>
  );
}
