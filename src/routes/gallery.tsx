import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHero, seo } from "@/components/site/PageHero";
import { EmptyState } from "@/components/site/ui-bits";
import { galleryQuery, mediaUrl } from "@/lib/public-data";

export const Route = createFileRoute("/gallery")({ staticData: { sitemap: true },
  head: () => seo("Photo Gallery | Skill Bridgeway Foundation", "Moments from our classes, events and graduations across Bangladesh.", { path: "/gallery" }),
  component: Gallery,
});

function Gallery() {
  const { data, isLoading } = useQuery(galleryQuery());
  const items = (data ?? []).map((g) => ({ ...g, url: mediaUrl(g.image_key) })).filter((g): g is typeof g & { url: string } => !!g.url);
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, step]);

  const current = open !== null ? items[open] : null;

  return (
    <>
      <PageHero eyebrow="Moments" title="Photo Gallery" />
      <section className="mx-auto max-w-7xl px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square bg-muted" />)}
          </div>
        ) : items.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {items.map((g, i) => (
              <button key={g.id} onClick={() => setOpen(i)} className="group relative aspect-square overflow-hidden rounded-lg border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <img src={g.url} alt={g.title ?? "Gallery photo"} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {g.title && <span className="absolute inset-x-0 bottom-0 bg-background/70 p-2 text-left text-xs opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">{g.title}</span>}
              </button>
            ))}
          </div>
        ) : <EmptyState>Photos will appear here soon.</EmptyState>}
      </section>

      {current && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-4 backdrop-blur" onClick={() => setOpen(null)}>
          <button aria-label="Close" className="absolute right-4 top-4 rounded-full border p-2 hover:text-primary" onClick={() => setOpen(null)}><X /></button>
          {items.length > 1 && (
            <>
              <button aria-label="Previous" className="absolute left-2 rounded-full border p-2 hover:text-primary md:left-6" onClick={(e) => { e.stopPropagation(); step(-1); }}><ChevronLeft /></button>
              <button aria-label="Next" className="absolute right-2 rounded-full border p-2 hover:text-primary md:right-6" onClick={(e) => { e.stopPropagation(); step(1); }}><ChevronRight /></button>
            </>
          )}
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img src={current.url} alt={current.title ?? "Gallery photo"} className="max-h-[80vh] w-auto rounded-lg object-contain" />
            {current.title && <figcaption className="mt-3 text-center text-sm text-muted-foreground">{current.title}</figcaption>}
          </figure>
        </div>
      )}
    </>
  );
}
