import { confirmAction } from "@/components/ConfirmDialog";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Eye, ImagePlus, Loader2, Pencil, Search, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminOnly, PageTitle, selectCls, useMediaUpload } from "@/components/admin/shared";
import { cdnUrl } from "@/lib/cdn";
import { IMAGE_TYPES, MAX_DOC_BYTES } from "@/lib/r2.functions";
import { seo } from "@/components/site/PageHero";

type Photo = Tables<"gallery_items">;
type Pending = { id: string; file: File; url: string; title: string; category: string; error?: string | undefined; key?: string; done?: boolean };
const PAGE_SIZE = 24;

export const Route = createFileRoute("/_authenticated/admin/gallery")({ staticData: { sitemap: false },
  head: () => seo("Manage Gallery | Skill Bridgeway Foundation", "Private gallery management.", { noindex: true }),
  component: () => <AdminOnly><GalleryAdmin /></AdminOnly>,
});

function GalleryAdmin() {
  const qc = useQueryClient();
  const upload = useMediaUpload();
  const urls = useRef<string[]>([]);
  useEffect(() => () => { urls.current.forEach(URL.revokeObjectURL); }, []);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<{ id: string; title: string; category: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<Photo | null>(null);
  const { data: rows = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: async () => {
      // Fetch in batches to avoid Supabase's default 1,000-row response limit.
      const all: Photo[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from("gallery_items").select("*").order("created_at", { ascending: false }).range(offset, offset + 999);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });
  const categories = useMemo(() => [...new Set(rows.map((r) => r.category?.trim()).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b)), [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    const matchesText = !search.trim() || `${r.title ?? ""} ${r.category ?? ""}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesText && (!categoryFilter || r.category === categoryFilter);
  }), [rows, search, categoryFilter]);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-gallery"] }); qc.invalidateQueries({ queryKey: ["gallery"] }); };
  const patchQueue = (id: string, patch: Partial<Pending>) => setQueue((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));

  function addFiles(files: FileList | null) {
    if (!files) return;
    const accepted: Pending[] = [];
    for (const file of Array.from(files)) {
      if (!(IMAGE_TYPES as readonly string[]).includes(file.type) || file.size > MAX_DOC_BYTES || !file.size) {
        toast.error(`${file.name}: use a JPG, PNG or WebP image under 5 MB`);
        continue;
      }
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      accepted.push({ id: crypto.randomUUID(), file, url, title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 150), category: "" });
    }
    setQueue((items) => [...items, ...accepted]);
  }

  async function uploadAll() {
    if (!queue.some((item) => !item.done)) return;
    setBusy(true);
    let saved = 0;
    let completed = 0;
    const pending = queue.filter((item) => !item.done);
    setProgress(0);
    for (const item of pending) {
      try {
        const key = item.key ?? await upload(item.file, "gallery");
        patchQueue(item.id, { key, error: undefined });
        const { error } = await supabase.from("gallery_items").insert({ image_key: key, title: item.title.trim() || null, category: item.category.trim() || null });
        if (error) throw error;
        patchQueue(item.id, { done: true, error: undefined });
        saved++;
      } catch (err) {
        patchQueue(item.id, { error: (err as Error).message });
      }
      completed++;
      setProgress(completed);
    }
    setBusy(false);
    if (saved) { toast.success(`${saved} photo${saved === 1 ? "" : "s"} added`); refresh(); }
    if (saved < pending.length) toast.error(`${pending.length - saved} photo${pending.length - saved === 1 ? "" : "s"} could not be added. Retry below.`);
    else setQueue([]);
  }

  async function remove(photo: Photo) {
    if (!(await confirmAction({ title: `Delete ${photo.title || "this photo"}?`, description: "It will be removed from the public gallery. The uploaded file may remain in storage.", confirmText: "Delete", destructive: true }))) return;
    const { error } = await supabase.from("gallery_items").delete().eq("id", photo.id);
    if (error) { toast.error(error.message); return; }
    setViewing(null);
    refresh();
    toast.success("Photo removed from gallery");
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    const { error } = await supabase.from("gallery_items").update({ title: editing.title.trim() || null, category: editing.category.trim() || null }).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setEditing(null);
    toast.success("Photo details saved");
    refresh();
  }

  return <>
    <PageTitle title="Gallery"><span className="text-sm text-muted-foreground">{rows.length} photos</span></PageTitle>
    <section aria-label="Add photos" className="border-y border-border py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-foreground">Add photos</h2><p className="mt-1 text-sm text-muted-foreground">JPG, PNG or WebP · up to 5 MB each. Captions and categories can be changed before publishing.</p></div>
        <Button asChild variant="outline"><label className="cursor-pointer"><ImagePlus className="h-4 w-4" />Choose images<input type="file" multiple accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={busy} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /></label></Button>
      </div>
      {queue.length > 0 && <div className="mt-5 space-y-3">
        {queue.map((item) => <div key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-start gap-3 border-b border-border pb-3 sm:grid-cols-[80px_minmax(0,1fr)_minmax(0,160px)_auto]">
          <img src={item.url} alt="" className="aspect-square w-16 rounded-md object-cover sm:w-20" />
          <div className="min-w-0 space-y-1"><Label htmlFor={`caption-${item.id}`} className="text-xs">Caption</Label><Input id={`caption-${item.id}`} maxLength={150} value={item.title} disabled={busy || item.done} onChange={(e) => patchQueue(item.id, { title: e.target.value })} />
            <div className="sm:hidden"><Label htmlFor={`category-mobile-${item.id}`} className="text-xs">Category</Label><Input id={`category-mobile-${item.id}`} maxLength={60} list="gallery-category-suggestions" value={item.category} disabled={busy || item.done} onChange={(e) => patchQueue(item.id, { category: e.target.value })} /></div>
            {item.error && <p role="alert" className="text-xs text-destructive">{item.error}</p>}{item.done && <p className="flex items-center gap-1 text-xs text-primary"><Check className="h-3 w-3" />Added</p>}
          </div>
          <div className="hidden min-w-0 space-y-1 sm:block"><Label htmlFor={`category-${item.id}`} className="text-xs">Category</Label><Input id={`category-${item.id}`} maxLength={60} list="gallery-category-suggestions" value={item.category} disabled={busy || item.done} onChange={(e) => patchQueue(item.id, { category: e.target.value })} /></div>
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${item.file.name} from selection`} disabled={busy} onClick={() => setQueue((items) => items.filter((v) => v.id !== item.id))}><X className="h-4 w-4" /></Button>
        </div>)}
        <div className="flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-sm text-muted-foreground">{busy ? `${progress} of ${queue.filter((i) => !i.done).length} processed` : `${queue.filter((i) => !i.done).length} ready to publish`}</p><Button disabled={busy || queue.every((i) => i.done)} onClick={uploadAll}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? "Publishing…" : "Publish photos"}</Button></div>
      </div>}
    </section>
    <datalist id="gallery-category-suggestions">{categories.map((category) => <option key={category} value={category} />)}</datalist>
    <section aria-label="Manage photos" className="py-7">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
        <div className="relative min-w-0"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search photos" placeholder="Search captions or categories" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" /></div>
        <select aria-label="Filter category" className={selectCls} value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}><option value="">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
      </div>
      {error && <div role="alert" className="mt-6 text-sm text-destructive">Could not load photos. <Button variant="link" onClick={() => refetch()}>Try again</Button></div>}
      {isLoading ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />)}</div>
        : !error && !filtered.length ? <div className="py-14 text-center text-sm text-muted-foreground">{rows.length ? "No photos match your search." : "No photos yet. Add images above to start your gallery."}</div>
          : <><p className="mt-5 text-xs text-muted-foreground" aria-live="polite">Showing {visible.length} of {filtered.length} photos</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((photo) => <article key={photo.id} className="min-w-0 overflow-hidden rounded-md border border-border bg-card">
              <Button type="button" variant="ghost" className="block h-auto w-full rounded-none p-0" aria-label={`View ${photo.title || "photo"}`} onClick={() => setViewing(photo)}><img src={cdnUrl(photo.image_key) ?? ""} alt={photo.title || "Gallery photo"} className="aspect-square w-full object-cover" loading="lazy" /></Button>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 p-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground" title={photo.title ?? "Untitled"}>{photo.title || "Untitled"}</p><p className="truncate text-xs text-muted-foreground">{photo.category || "Uncategorized"}</p></div><div className="flex shrink-0">
                <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${photo.title || "photo"}`} title="Edit details" onClick={() => setEditing({ id: photo.id, title: photo.title ?? "", category: photo.category ?? "" })}><Pencil className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${photo.title || "photo"}`} title="Delete" onClick={() => remove(photo)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div></div>
            </article>)}
          </div>{pages > 1 && <div className="mt-6 flex items-center justify-center gap-4"><Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button><span className="text-sm text-muted-foreground">{page + 1} / {pages}</span><Button variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button></div>}</>}
    </section>
    <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !saving) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>Edit photo details</DialogTitle><DialogDescription>Captions describe the photo for visitors and screen readers.</DialogDescription></DialogHeader><form onSubmit={saveDetails} className="space-y-4"><div className="space-y-2"><Label htmlFor="gallery-edit-title">Caption</Label><Input id="gallery-edit-title" maxLength={150} value={editing?.title ?? ""} onChange={(e) => setEditing((v) => v ? { ...v, title: e.target.value } : null)} /></div><div className="space-y-2"><Label htmlFor="gallery-edit-category">Category</Label><Input id="gallery-edit-category" maxLength={60} list="gallery-category-suggestions" value={editing?.category ?? ""} onChange={(e) => setEditing((v) => v ? { ...v, category: e.target.value } : null)} /></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save changes</Button></div></form></DialogContent></Dialog>
    <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null); }}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>{viewing?.title || "Untitled photo"}</DialogTitle><DialogDescription>{viewing?.category || "Gallery photo"}</DialogDescription></DialogHeader>{viewing && <img src={cdnUrl(viewing.image_key) ?? ""} alt={viewing.title || "Gallery photo"} className="max-h-[70vh] w-full object-contain" />}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setViewing(null)}>Close</Button><Button onClick={() => { if (viewing) { setEditing({ id: viewing.id, title: viewing.title ?? "", category: viewing.category ?? "" }); setViewing(null); } }}><Pencil className="h-4 w-4" />Edit details</Button></div></DialogContent></Dialog>
  </>;
}
