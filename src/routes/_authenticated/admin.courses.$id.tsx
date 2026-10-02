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
import { CourseMedia, EnrollGate, RichContent } from "@/components/site/CourseMedia";
import { slugify } from "@/lib/cdn";
import { COURSE_LEVELS, DURATION_UNITS, durationLabel, imagesOf, youtubeId } from "@/lib/course-content";
import { seo } from "@/components/site/PageHero";

const RichTextEditor = lazy(() => import("@/components/admin/RichTextEditor").then((m) => ({ default: m.RichTextEditor })));

export const Route = createFileRoute("/_authenticated/admin/courses/$id")({ staticData: { sitemap: false },
  head: () => seo("Edit Course | Skill Bridgeway Foundation", "Private course editor.", { noindex: true }),
  component: () => <AdminOnly><CourseEditor /></AdminOnly>,
});

const empty = { title: "", slug: "", summary: "", description: "", category: "", level: "", duration_value: "", duration_unit: "", image_keys: [] as string[], video_url: "", apply_start: "", apply_end: "", is_published: false };
type Form = typeof empty;
const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(150),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,80}$/, "Slug: lowercase letters, numbers, dashes"),
  summary: z.string().trim().max(300),
  image_keys: z.array(z.string()).min(1, "Add at least 1 image").max(5),
});
// datetime-local <-> ISO in the admin's local time zone
const toLocal = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
const toIso = (v: string) => (v ? new Date(v).toISOString() : null);

function CourseEditor() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState<Form>(empty);
  const [orig, setOrig] = useState<Form>(empty);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<Form>) => setF((c) => ({ ...c, ...p }));

  const { data: course, isLoading } = useQuery({ queryKey: ["admin-course", id], enabled: !isNew, queryFn: async () => (await supabase.from("courses").select("*").eq("id", id).maybeSingle()).data });
  const { data: cats = [] } = useQuery({ queryKey: ["course-categories"], queryFn: async () => (await supabase.from("course_categories").select("id, name").order("sort_order").order("name")).data ?? [] });
  useEffect(() => {
    if (!course) return;
    const v: Form = { title: course.title, slug: course.slug, summary: course.summary ?? "", description: course.description ?? "", category: course.category ?? "", level: course.level ?? "",
      duration_value: course.duration_value ? String(course.duration_value) : "", duration_unit: course.duration_unit ?? "", image_keys: imagesOf(course), video_url: course.video_url ?? "",
      apply_start: toLocal(course.apply_start), apply_end: toLocal(course.apply_end), is_published: course.is_published };
    setF(v); setOrig(v);
  }, [course]);
  const dirty = JSON.stringify(f) !== JSON.stringify(orig);
  useEffect(() => { if (!dirty) return; const h = (e: BeforeUnloadEvent) => e.preventDefault(); window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);

  const unit = DURATION_UNITS.find((u) => u.v === f.duration_unit);
  const legacyCat = f.category && !cats.some((c) => c.name === f.category);

  async function save() {
    const r = schema.safeParse(f);
    if (!r.success) { toast.error(r.error.issues[0]?.message); return; }
    if (f.video_url && !youtubeId(f.video_url)) { toast.error("Enter a valid YouTube video link"); return; }
    if (f.apply_start && f.apply_end && f.apply_end <= f.apply_start) { toast.error("Application end must be after the start"); return; }
    if (f.duration_unit && !f.duration_value) { toast.error("Choose how many " + f.duration_unit); return; }
    const dv = f.duration_value ? Number(f.duration_value) : null;
    const payload = {
      title: r.data.title, slug: r.data.slug, summary: r.data.summary || null, description: f.description || null, category: f.category || null, level: f.level || null,
      duration_value: dv, duration_unit: dv ? f.duration_unit : null, duration: durationLabel(dv, f.duration_unit) ?? null,
      image_keys: f.image_keys, cover_image_key: f.image_keys[0] ?? null, video_url: f.video_url.trim() || null,
      apply_start: toIso(f.apply_start), apply_end: toIso(f.apply_end), is_published: f.is_published,
    };
    setBusy(true);
    const res = isNew
      ? await supabase.from("courses").insert({ ...payload, sort_order: 9999 }).select("id").single()
      : await supabase.from("courses").update(payload).eq("id", id).select("id").single();
    setBusy(false);
    if (res.error) { toast.error(res.error.message.includes("duplicate") ? "That slug is already used" : res.error.message); return; }
    toast.success("Course saved");
    setOrig(f);
    qc.invalidateQueries({ queryKey: ["admin-courses"] }); qc.invalidateQueries({ queryKey: ["courses"] }); qc.invalidateQueries({ queryKey: ["admin-course", id] }); qc.invalidateQueries({ queryKey: ["course"] });
    if (isNew) navigate({ to: "/admin/courses/$id", params: { id: res.data.id }, replace: true });
  }

  if (!isNew && isLoading) return <p className="text-muted-foreground">Loading course...</p>;
  if (!isNew && !course) return <div className="glass rounded-xl p-8">Course not found. <Link to="/admin/courses" className="text-primary">Back</Link></div>;

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />All courses</Link>
        <div className="inline-flex rounded-lg border border-border p-1">
          {(["edit", "preview"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t === "edit" ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{t}</button>)}
        </div>
      </div>
      <h1 className="section-title text-2xl md:text-3xl">{isNew ? "New course" : f.title || "Edit course"}</h1>

      {tab === "preview" ? <Preview f={f} /> : <>
        <Card title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="c-title">Title</Label><Input id="c-title" value={f.title} onChange={(e) => set({ title: e.target.value, ...(isNew && f.slug === slugify(f.title) ? { slug: slugify(e.target.value) } : {}) })} /></div>
            <div className="space-y-2"><Label htmlFor="c-slug">Web address (slug)</Label><Input id="c-slug" value={f.slug} onChange={(e) => set({ slug: slugify(e.target.value) })} /><p className="text-xs text-muted-foreground">skillbridgeway.org/courses/{f.slug || "…"}</p></div>
            <div className="space-y-2"><Label htmlFor="c-cat">Category</Label>
              <select id="c-cat" className={selectCls} value={f.category} onChange={(e) => set({ category: e.target.value })}>
                <option value="">Choose category</option>{legacyCat && <option value={f.category}>{f.category}</option>}{cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              {cats.length === 0 && <p className="text-xs text-muted-foreground">Add categories on the Courses page first.</p>}</div>
            <div className="space-y-2"><Label htmlFor="c-level">Level</Label>
              <select id="c-level" className={selectCls} value={f.level} onChange={(e) => set({ level: e.target.value })}><option value="">Choose level</option>{COURSE_LEVELS.map((l) => <option key={l}>{l}</option>)}{f.level && !(COURSE_LEVELS as readonly string[]).includes(f.level) && <option>{f.level}</option>}</select></div>
            <div className="space-y-2"><Label>Duration</Label>
              <div className="grid grid-cols-2 gap-2">
                <select aria-label="Duration type" className={selectCls} value={f.duration_unit} onChange={(e) => set({ duration_unit: e.target.value, duration_value: "" })}><option value="">Type</option>{DURATION_UNITS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}</select>
                {unit && <select aria-label={`Number of ${unit.label}`} className={selectCls} value={f.duration_value} onChange={(e) => set({ duration_value: e.target.value })}><option value="">How many?</option>{Array.from({ length: unit.max }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n > 1 ? unit.label : unit.label.slice(0, -1)}</option>)}</select>}
              </div></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="c-sum">Short summary</Label><Textarea id="c-sum" rows={2} maxLength={300} value={f.summary} onChange={(e) => set({ summary: e.target.value })} /><p className="text-right text-xs text-muted-foreground">{f.summary.length}/300</p></div>
          </div>
        </Card>
        <Card title="Images & video">
          <CourseImages value={f.image_keys} onChange={(v) => set({ image_keys: v })} />
          <div className="mt-5 space-y-2"><Label htmlFor="c-vid">YouTube video link (optional)</Label><Input id="c-vid" placeholder="https://www.youtube.com/watch?v=…" value={f.video_url} onChange={(e) => set({ video_url: e.target.value })} />
            {f.video_url && (youtubeId(f.video_url) ? <img src={`https://i.ytimg.com/vi/${youtubeId(f.video_url)}/mqdefault.jpg`} alt="Video thumbnail" className="mt-2 aspect-video w-48 rounded-md object-cover" /> : <p className="text-xs text-destructive">This doesn't look like a YouTube link.</p>)}</div>
        </Card>
        <Card title="Description">
          <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-muted/30" />}><RichTextEditor value={f.description} onChange={(v) => set({ description: v })} /></Suspense>
        </Card>
        <Card title="Application window">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="c-as">Applications open</Label><Input id="c-as" type="datetime-local" value={f.apply_start} onChange={(e) => set({ apply_start: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="c-ae">Applications close</Label><Input id="c-ae" type="datetime-local" value={f.apply_end} min={f.apply_start || undefined} onChange={(e) => set({ apply_end: e.target.value })} /></div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Leave empty to keep enrollment always open. Before the start a countdown shows; after the end the Enroll button turns off automatically.</p>
          <label className="mt-5 flex items-center gap-3 text-sm"><Switch checked={f.is_published} onCheckedChange={(v) => set({ is_published: v })} />Published on the website</label>
        </Card>
      </>}

      <div className="glass sticky bottom-4 z-20 flex flex-wrap items-center justify-end gap-2 rounded-2xl p-3">
        {dirty && <span className="mr-auto text-xs text-highlight">Unsaved changes</span>}
        <Button variant="outline" disabled={!dirty || busy} onClick={() => setF(orig)}>Discard</Button>
        <Button onClick={save} disabled={busy || (!dirty && !isNew)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isNew ? "Create course" : "Save changes"}</Button>
      </div>
    </div>
  );
}

function Preview({ f }: { f: Form }) {
  const dur = durationLabel(Number(f.duration_value) || null, f.duration_unit);
  return <div className="grid gap-10 rounded-2xl border border-border p-4 md:p-8 lg:grid-cols-[1fr_320px]">
    <article className="min-w-0">
      <h1 className="section-title mb-3 text-3xl">{f.title || "Course title"}</h1>
      {f.summary && <p className="mb-6 text-muted-foreground">{f.summary}</p>}
      <CourseMedia images={f.image_keys} video={f.video_url} title={f.title} />
      <h2 className="section-title text-xl">Course overview</h2>
      <RichContent html={f.description} className="mt-4" />
    </article>
    <aside className="glass h-fit space-y-4 rounded-xl p-6">
      <p className="font-heading text-3xl font-extrabold text-primary">FREE</p>
      <ul className="space-y-2 text-sm text-muted-foreground">{f.category && <li>{f.category}</li>}{dur && <li>{dur}</li>}{f.level && <li>{f.level}</li>}</ul>
      <EnrollGate start={toIso(f.apply_start)} end={toIso(f.apply_end)}><Button size="lg" className="w-full bg-highlight text-highlight-foreground">Free Admission</Button></EnrollGate>
    </aside>
  </div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="glass rounded-2xl p-5 md:p-6"><h2 className="section-title mb-5 text-lg">{title}</h2>{children}</section>;
}
