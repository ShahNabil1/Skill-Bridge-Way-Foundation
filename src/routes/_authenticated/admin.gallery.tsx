import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminOnly, PageTitle, useMediaUpload } from "@/components/admin/shared";
import { cdnUrl } from "@/lib/cdn";
import { IMAGE_TYPES } from "@/lib/r2.functions";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/gallery")({ staticData: { sitemap: false },
  head: () => seo("Manage Gallery | Skill Bridgeway Foundation", "Private gallery management.", { noindex: true }),
  component: () => <AdminOnly><GalleryAdmin /></AdminOnly>,
});

function GalleryAdmin() {
  const qc = useQueryClient();
  const upload = useMediaUpload();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: async () => (await supabase.from("gallery_items").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string; category: string } | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-gallery"] }); qc.invalidateQueries({ queryKey: ["gallery"] }); };

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) { toast.error("Choose at least one image"); return; }
    setBusy(true);
    let ok = 0;
    for (const file of files) {
      try {
        const key = await upload(file, "gallery");
        const { error } = await supabase.from("gallery_items").insert({ image_key: key, title: title.trim().slice(0, 150) || null, category: category.trim().slice(0, 60) || null });
        if (error) throw error;
        ok++;
      } catch (err) { toast.error(`${file.name}: ${(err as Error).message}`); }
    }
    setBusy(false);
    if (ok) toast.success(`${ok} photo(s) added`);
    setFiles([]); setTitle("");
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this photo?")) return;
    const { error } = await supabase.from("gallery_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  async function saveCaption(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { error } = await supabase.from("gallery_items").update({
      title: editing.title.trim().slice(0, 150) || null,
      category: editing.category.trim().slice(0, 60) || null,
    }).eq("id", editing.id);
    if (error) { toast.error(error.message); return; }
    setEditing(null);
    toast.success("Photo details saved");
    refresh();
  }

  return (
    <>
      <PageTitle title="Gallery" />
      <form onSubmit={onUpload} className="glass mb-6 grid gap-4 rounded-xl p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <div className="space-y-2"><Label>Images</Label>
          <Input type="file" multiple accept={IMAGE_TYPES.join(",")} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></div>
        <div className="space-y-2"><Label>Caption (optional)</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-2"><Label>Category (optional)</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Workshop, Event..." /></div>
        <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload</Button>
      </form>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : rows.length === 0 ? <p className="text-muted-foreground">No photos yet.</p> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((g) => (
            <div key={g.id} className="glass group relative overflow-hidden rounded-lg">
              <img src={cdnUrl(g.image_key)!} alt={g.title ?? ""} className="aspect-square w-full object-cover" loading="lazy" />
              <div className="flex items-center justify-between gap-2 p-2">
                <p className="truncate text-xs text-muted-foreground">{g.title ?? g.category ?? "Untitled"}</p>
                <div className="flex shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ id: g.id, title: g.title ?? "", category: g.category ?? "" })} aria-label={`Edit ${g.title ?? "photo"}`}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(g.id)} aria-label={`Delete ${g.title ?? "photo"}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit photo details</DialogTitle></DialogHeader>
          <form onSubmit={saveCaption} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="gallery-edit-title">Caption</Label><Input id="gallery-edit-title" maxLength={150} value={editing?.title ?? ""} onChange={(e) => setEditing((value) => value ? { ...value, title: e.target.value } : null)} /></div>
            <div className="space-y-2"><Label htmlFor="gallery-edit-category">Category</Label><Input id="gallery-edit-category" maxLength={60} value={editing?.category ?? ""} onChange={(e) => setEditing((value) => value ? { ...value, category: e.target.value } : null)} /></div>
            <Button type="submit">Save changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
