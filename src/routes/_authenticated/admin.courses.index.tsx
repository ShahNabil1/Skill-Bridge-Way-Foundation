import { confirmAction } from "@/components/ConfirmDialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AdminOnly, PageTitle } from "@/components/admin/shared";
import { cdnUrl } from "@/lib/cdn";
import { applyState, imagesOf } from "@/lib/course-content";
import { seo } from "@/components/site/PageHero";
import { PROGRAM } from "@/lib/program-pathway";

export const Route = createFileRoute("/_authenticated/admin/courses/")({ staticData: { sitemap: false },
  head: () => seo("Manage Courses | Skill Bridgeway Foundation", "Private course management.", { noindex: true }),
  component: () => <AdminOnly><CoursesAdmin /></AdminOnly>,
});

type Row = { id: string; title: string; slug: string; category: string | null; is_published: boolean; sort_order: number; image_keys: unknown; cover_image_key: string | null; apply_start: string | null; apply_end: string | null };

function SortRow({ c, onToggle, onDelete }: { c: Row; onToggle: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const img = cdnUrl(imagesOf(c)[0]);
  const st = applyState(c.apply_start, c.apply_end);
  const step = PROGRAM.find((p) => p.slug === c.slug);
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-3 rounded-xl border bg-card p-3 ${isDragging ? "z-10 border-primary shadow-xl" : "border-border"}`}>
    <button {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"><GripVertical className="h-5 w-5" /></button>
    <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-muted">{img && <img src={img} alt="" className="h-full w-full object-cover" />}</div>
    <div className="min-w-0 flex-1"><p className="truncate font-medium">{step ? <span className="mr-2 rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary">Segment 0{step.segment} · Course {step.number}</span> : c.slug.startsWith("demo-") ? <span className="mr-2 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">Old demo</span> : null}{c.title}</p><p className="truncate text-xs text-muted-foreground">{c.category ?? "No category"} · /{c.slug} · <span className={st.phase === "open" ? "text-primary" : "text-highlight"}>{st.phase === "open" ? "Enrollment open" : st.phase === "upcoming" ? "Opens soon" : "Closed"}</span></p></div>
    <label className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">Published<Switch checked={c.is_published} onCheckedChange={onToggle} /></label>
    <Button asChild size="icon" variant="ghost" aria-label="Edit"><Link to="/admin/courses/$id" params={{ id: c.id }}><Pencil className="h-4 w-4" /></Link></Button>
    <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
  </li>;
}

function CoursesAdmin() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => ((await supabase.from("courses").select("id, title, slug, category, is_published, sort_order, image_keys, cover_image_key, apply_start, apply_end").order("sort_order").order("created_at", { ascending: false })).data ?? []) as Row[],
  });
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => setRows(data), [data]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-courses"] }); qc.invalidateQueries({ queryKey: ["courses"] }); };

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(rows, rows.findIndex((r) => r.id === e.active.id), rows.findIndex((r) => r.id === e.over!.id));
    setRows(next);
    const changed = next.map((r, i) => ({ id: r.id, i })).filter(({ id, i }) => rows.find((r) => r.id === id)?.sort_order !== i);
    const res = await Promise.all(changed.map(({ id, i }) => supabase.from("courses").update({ sort_order: i }).eq("id", id)));
    if (res.some((r) => r.error)) toast.error("Could not save the new order"); else toast.success("Order saved");
    refresh();
  }
  async function remove(c: Row) {
    if (!(await confirmAction({ title: `Delete "${c.title}"?`, description: "This course will be permanently removed.", confirmText: "Delete", destructive: true }))) return;
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  async function toggle(c: Row) { await supabase.from("courses").update({ is_published: !c.is_published }).eq("id", c.id); refresh(); }

  return (
    <>
      <PageTitle title="Courses"><Button asChild><Link to="/admin/courses/$id" params={{ id: "new" }}><Plus className="h-4 w-4" />New course</Link></Button></PageTitle>
      <p className="mb-3 text-xs text-muted-foreground">Drag the handle to change the order shown on the website. The four 75-day program courses are labelled by segment; keep their web address (slug) unchanged so the Courses page journey stays connected. Old demos are unpublished to keep past applications.</p>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : rows.length === 0 ? <p className="glass rounded-xl p-6 text-muted-foreground">No courses yet.</p> : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">{rows.map((c) => <SortRow key={c.id} c={c} onToggle={() => toggle(c)} onDelete={() => remove(c)} />)}</ul>
          </SortableContext>
        </DndContext>
      )}
      <Categories />
    </>
  );
}

function Categories() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data: cats = [] } = useQuery({ queryKey: ["course-categories"], queryFn: async () => (await supabase.from("course_categories").select("id, name").order("sort_order").order("name")).data ?? [] });
  const refresh = () => qc.invalidateQueries({ queryKey: ["course-categories"] });
  async function add() {
    const n = name.trim(); if (n.length < 2) return;
    const { error } = await supabase.from("course_categories").insert({ name: n.slice(0, 60) });
    if (error) { toast.error(error.code === "23505" ? "That category already exists" : error.message); return; }
    setName(""); refresh();
  }
  async function del(c: { id: string; name: string }) {
    if (!(await confirmAction({ title: `Delete category "${c.name}"?`, description: "Courses already using it keep their label.", confirmText: "Delete", destructive: true }))) return;
    await supabase.from("course_categories").delete().eq("id", c.id); refresh();
  }
  return <section className="glass mt-8 rounded-xl p-5">
    <h2 className="section-title mb-4 flex items-center gap-2 text-lg"><Tags className="h-5 w-5 text-primary" />Categories</h2>
    <div className="mb-4 flex flex-wrap gap-2">{cats.length === 0 ? <p className="text-sm text-muted-foreground">No categories yet.</p> : cats.map((c) => <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm">{c.name}<button onClick={() => del(c)} aria-label={`Delete ${c.name}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></span>)}</div>
    <form className="flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}><Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="New category, e.g. Artificial Intelligence" /><Button type="submit"><Plus className="h-4 w-4" />Add</Button></form>
  </section>;
}
