import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, Eye, Loader2, Pencil, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AdminOnly, selectCls } from "@/components/admin/shared";
import { CourseImages } from "@/components/admin/CourseImages";
import { NoticeContent } from "@/components/site/NoticeContent";
import { slugify, cdnUrl } from "@/lib/cdn";
import { seo } from "@/components/site/PageHero";

const RichTextEditor = lazy(() => import("@/components/admin/RichTextEditor").then((m) => ({ default: m.RichTextEditor })));

export const Route = createFileRoute("/_authenticated/admin/notices/$id")({ staticData: { sitemap: false },
  head: () => seo("Edit Notice | Skill Bridgeway Foundation", "Private notice and event editor.", { noindex: true }),
  component: () => <AdminOnly><NoticeEditor /></AdminOnly>,
});

const empty = { title: "", slug: "", summary: "", body: "", type: "notice" as "notice" | "event", event_date: "", cover_image_key: "", is_published: false };
type Form = typeof empty;
const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(200),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,80}$/, "Web address must be 3–80 lowercase letters, numbers or dashes"),
  summary: z.string().trim().max(300),
  body: z.string().trim().max(100000, "Details are too long"),
  type: z.enum(["notice", "event"]),
});
const toLocal = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };

function NoticeEditor() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(empty);
  const [orig, setOrig] = useState<Form>(empty);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Form>) => setF((prev) => ({ ...prev, ...patch }));
  const { data: notice, isLoading, error } = useQuery({
    queryKey: ["admin-notice", id], enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.from("notices").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (!notice) return;
    const v: Form = { title: notice.title, slug: notice.slug, summary: notice.summary ?? "", body: notice.body ?? "", type: notice.type, event_date: toLocal(notice.event_date), cover_image_key: notice.cover_image_key ?? "", is_published: notice.is_published };
    setF(v); setOrig(v);
  }, [notice]);
  const dirty = JSON.stringify(f) !== JSON.stringify(orig);
  useEffect(() => { if (!dirty) return; const h = (e: BeforeUnloadEvent) => e.preventDefault(); window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);

  async function save() {
    const parsed = schema.safeParse(f);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    if (f.event_date && Number.isNaN(new Date(f.event_date).getTime())) { toast.error("Enter a valid event date"); return; }
    const payload = { ...parsed.data, summary: parsed.data.summary || null, body: parsed.data.body || null,
      event_date: f.type === "event" && f.event_date ? new Date(f.event_date).toISOString() : null,
      cover_image_key: f.cover_image_key || null, is_published: f.is_published };
    setBusy(true);
    const result = isNew ? await supabase.from("notices").insert(payload).select("id").single()
      : await supabase.from("notices").update(payload).eq("id", id).select("id").single();
    setBusy(false);
    if (result.error) { toast.error(result.error.code === "23505" ? "That web address is already used" : result.error.message); return; }
    toast.success("Notice saved"); setOrig(f);
    qc.invalidateQueries({ queryKey: ["admin-notices"] });
    qc.invalidateQueries({ queryKey: ["notices"] });
    qc.invalidateQueries({ queryKey: ["notice"] });
    qc.invalidateQueries({ queryKey: ["admin-notice", id] });
    if (isNew) navigate({ to: "/admin/notices/$id", params: { id: result.data.id }, replace: true });
  }

  if (!isNew && isLoading) return <p className="text-muted-foreground">Loading notice...</p>;
  if (!isNew && (error || !notice)) return <p className="text-muted-foreground">Notice not found. <Link to="/admin/notices" className="text-primary">Back to notices</Link></p>;

  return <div className="space-y-6 pb-28">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/admin/notices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />All notices</Link>
      <div className="inline-flex rounded-md border border-border p-1" role="group" aria-label="Editor view">
        <Button size="sm" variant={tab === "edit" ? "secondary" : "ghost"} onClick={() => setTab("edit")}><Pencil className="h-4 w-4" /> Edit</Button>
        <Button size="sm" variant={tab === "preview" ? "secondary" : "ghost"} onClick={() => setTab("preview")}><Eye className="h-4 w-4" /> Preview</Button>
      </div>
    </div>
    <h1 className="section-title text-2xl md:text-3xl">{isNew ? "New notice / event" : f.title || "Edit notice"}</h1>
    {tab === "preview" ? <article className="mx-auto max-w-4xl space-y-6">
      <p className="text-sm uppercase text-primary">{f.type} {f.event_date && `· ${new Date(f.event_date).toLocaleDateString("en-GB", { dateStyle: "long" })}`}</p>
      <h2 className="section-title text-3xl">{f.title || "Notice title"}</h2>
      {f.summary && <p className="text-lg text-muted-foreground">{f.summary}</p>}
      {f.cover_image_key && <img src={cdnUrl(f.cover_image_key) ?? ""} alt={f.title} className="aspect-video w-full rounded-md object-cover" />}
      <NoticeContent body={f.body} />
    </article> : <div className="mx-auto max-w-4xl space-y-8">
      <section className="space-y-5"><h2 className="section-title border-b pb-3 text-lg">Basics</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="n-title">Title</Label><Input id="n-title" maxLength={200} value={f.title} onChange={(e) => set({ title: e.target.value, ...(isNew && f.slug === slugify(f.title) ? { slug: slugify(e.target.value) } : {}) })} /></div>
          <div className="space-y-2"><Label htmlFor="n-slug">Web address</Label><Input id="n-slug" value={f.slug} onChange={(e) => set({ slug: slugify(e.target.value) })} /><p className="text-xs text-muted-foreground">skillbridgeway.org/notices/{f.slug || "…"}</p></div>
          <div className="space-y-2"><Label htmlFor="n-type">Type</Label><select id="n-type" className={selectCls} value={f.type} onChange={(e) => set({ type: e.target.value as Form["type"] })}><option value="notice">Notice</option><option value="event">Event</option></select></div>
          {f.type === "event" && <div className="space-y-2"><Label htmlFor="n-date">Event date (optional)</Label><Input id="n-date" type="datetime-local" value={f.event_date} onChange={(e) => set({ event_date: e.target.value })} /></div>}
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="n-summary">Short summary</Label><Textarea id="n-summary" rows={2} maxLength={300} value={f.summary} onChange={(e) => set({ summary: e.target.value })} /><p className="text-right text-xs text-muted-foreground">{f.summary.length}/300</p></div>
        </div>
      </section>
      <section className="space-y-4"><h2 className="section-title border-b pb-3 text-lg">Cover image</h2><CourseImages folder="notices" max={1} value={f.cover_image_key ? [f.cover_image_key] : []} onChange={(keys) => set({ cover_image_key: keys[0] ?? "" })} /></section>
      <section className="space-y-4"><h2 className="section-title border-b pb-3 text-lg">Details</h2><Suspense fallback={<div className="h-80 animate-pulse bg-muted/30" />}><RichTextEditor folder="notices" value={f.body} onChange={(body) => set({ body })} /></Suspense></section>
      <label className="flex items-center gap-3 text-sm"><Switch checked={f.is_published} onCheckedChange={(is_published) => set({ is_published })} />Published on the website</label>
    </div>}
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-end gap-2 rounded-md border border-border bg-card p-3 shadow-lg">
      {dirty && <span className="mr-auto text-xs text-highlight">Unsaved changes</span>}
      <Button variant="outline" disabled={!dirty || busy} onClick={() => setF(orig)}>Discard</Button>
      <Button onClick={save} disabled={busy || (!dirty && !isNew)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isNew ? "Create notice" : "Save changes"}</Button>
    </div>
  </div>;
}