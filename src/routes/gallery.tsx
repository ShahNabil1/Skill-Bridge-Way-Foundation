import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHero, seo } from "@/components/site/PageHero";
import { EmptyState } from "@/components/site/ui-bits";
import { galleryQuery, mediaUrl } from "@/lib/public-data";
import { cdnImageSet } from "@/lib/cdn";

export const Route = createFileRoute("/gallery")({ staticData: { sitemap: true },
  head: () => seo("Photo Gallery | Skill Bridgeway Foundation", "Moments from our classes, events and graduations across Bangladesh.", { path: "/gallery" }),
  loader: async ({ context }) => { try { return await context.queryClient.ensureQueryData(galleryQuery()); } catch { return []; } },
  component: Gallery,
});

function Gallery() {
  const { data, isLoading } = useQuery(galleryQuery());
  const items = (data ?? []).map((g) => ({ ...g, url: mediaUrl(g.image_key) })).filter((g): g is typeof g & { url: string } => !!g.url);
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (open === null) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "Tab") {
        const buttons = Array.from(document.querySelectorAll<HTMLElement>('[aria-label="Photo viewer"] button'));
        if (!buttons.length) return;
        const currentIndex = buttons.indexOf(document.activeElement as HTMLElement);
        const nextIndex = e.shiftKey ? (currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1) : (currentIndex < 0 || currentIndex === buttons.length - 1 ? 0 : currentIndex + 1);
        e.preventDefault();
        buttons[nextIndex]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.querySelector<HTMLElement>('[aria-label="Photo viewer"] button')?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previousOverflow; previouslyFocused?.focus(); };
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
              <Button key={g.id} variant="ghost" onClick={() => setOpen(i)} aria-label={`View ${g.title ?? "gallery photo"}`} className="editorial-item group relative aspect-square h-auto w-full overflow-hidden rounded-md border p-0 focus-visible:ring-2 focus-visible:ring-ring">
                <img {...cdnImageSet(g.image_key, [320, 480, 720], "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw")} alt={g.title ?? "Skill Bridgeway Foundation training activity"} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {g.title && <span className="absolute inset-x-0 bottom-0 bg-background/80 p-2 text-left text-xs backdrop-blur transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">{g.title}</span>}
              </Button>
            ))}
          </div>
        ) : <EmptyState>Photos will appear here soon.</EmptyState>}
      </section>

      {current && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-4 backdrop-blur" onClick={() => setOpen(null)}>
          <Button variant="outline" size="icon" aria-label="Close" className="absolute right-4 top-4" onClick={() => setOpen(null)}><X /></Button>
          {items.length > 1 && (
            <>
               <Button variant="outline" size="icon" aria-label="Previous" className="absolute left-2 md:left-6" onClick={(e) => { e.stopPropagation(); step(-1); }}><ChevronLeft /></Button>
               <Button variant="outline" size="icon" aria-label="Next" className="absolute right-2 md:right-6" onClick={(e) => { e.stopPropagation(); step(1); }}><ChevronRight /></Button>
            </>
          )}
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img src={current.url} alt={current.title ?? "Skill Bridgeway Foundation training activity"} className="max-h-[80vh] w-auto rounded-lg object-contain" />
            {current.title && <figcaption className="mt-3 text-center text-sm text-muted-foreground">{current.title}</figcaption>}
          </figure>
        </div>
      )}
    </>
  );
}
