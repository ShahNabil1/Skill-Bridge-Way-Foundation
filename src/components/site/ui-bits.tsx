import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BookOpen, Clock, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { mediaUrl } from "@/lib/public-data";

export function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{eyebrow}</p>}
      <h2 className="section-title mt-2 text-2xl md:text-4xl">{title}</h2>
      {children && <p className="mt-3 text-muted-foreground">{children}</p>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="glass rounded-xl p-8 text-center text-muted-foreground">{children}</div>;
}

export function CardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass space-y-3 rounded-xl p-5">
          <Skeleton className="aspect-video w-full bg-muted" />
          <Skeleton className="h-5 w-3/4 bg-muted" />
          <Skeleton className="h-4 w-full bg-muted" />
          <Skeleton className="h-4 w-1/2 bg-muted" />
        </div>
      ))}
    </div>
  );
}

type CourseCardData = {
  id: string; title: string; slug: string; summary: string | null;
  category: string | null; duration: string | null; level: string | null; cover_image_key: string | null;
};

export function CourseCard({ c }: { c: CourseCardData }) {
  const img = mediaUrl(c.cover_image_key);
  return (
    <Link to="/courses/$slug" params={{ slug: c.slug }} className="glass group flex flex-col overflow-hidden rounded-xl transition-colors hover:border-primary/60">
      <div className="bg-grid relative aspect-video overflow-hidden border-b">
        {img ? (
          <img src={img} alt={c.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="section-title px-6 text-center text-lg text-primary/80">{c.category ?? "Course"}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {c.category && <span className="text-xs font-semibold uppercase tracking-wider text-primary">{c.category}</span>}
        <h3 className="mt-1 text-lg">{c.title}</h3>
        {c.summary && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.summary}</p>}
        <div className="mt-auto flex flex-wrap gap-4 pt-4 text-xs text-muted-foreground">
          {c.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.duration}</span>}
          {c.level && <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" />{c.level}</span>}
          <span className="flex items-center gap-1 text-primary"><BookOpen className="h-3.5 w-3.5" />{c.slug.startsWith("demo-") ? "Preview" : "Free"}</span>
        </div>
      </div>
    </Link>
  );
}
